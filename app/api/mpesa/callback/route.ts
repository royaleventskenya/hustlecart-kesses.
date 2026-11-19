// POST /api/mpesa/callback — Daraja calls this endpoint after the shopper
// completes (or fails) the M-Pesa STK push.
//
// In simulation mode, the stkPush() function in src/lib/mpesa.ts calls this
// endpoint directly after 3 seconds with a simulated success response.
//
// On success: marks the order as PAID + records the receipt number + sends
// an SMS to the shopper + notifies the operator.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emitToOperator } from "@/lib/order-events";
import { sendSms } from "@/lib/sms";
import { shortOrderId } from "@/lib/format";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Daraja callback structure:
    // {
    //   Body: {
    //     stkCallback: {
    //       CheckoutRequestID: "...",
    //       ResultCode: 0,  // 0 = success, non-zero = failure
    //       ResultDesc: "...",
    //       CallbackMetadata: {
    //         Item: [
    //           { Name: "Amount", Value: 105 },
    //           { Name: "MpesaReceiptNumber", Value: "SGH4X7P2H6" },
    //           { Name: "PhoneNumber", Value: 254712345678 },
    //         ]
    //       }
    //     }
    //   }
    // }
    //
    // In simulation mode, we also get _orderId (so we know which order this is
    // without having to look up by CheckoutRequestID).

    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) {
      return NextResponse.json({ ok: false, error: "Invalid callback format" }, { status: 400 });
    }

    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;
    const isSimulated = Boolean(body?._simulated);
    const orderId = body?._orderId || null;

    // Try to find the order by CheckoutRequestID (real mode) or _orderId (simulated).
    let order = null;
    if (orderId) {
      order = await db.order.findUnique({
        where: { id: orderId },
        select: { id: true, total: true, customerPhone: true, customerName: true, paymentStatus: true },
      });
    }

    if (!order) {
      console.warn("[mpesa/callback] order not found for callback", { orderId, checkoutId: stkCallback.CheckoutRequestID });
      return NextResponse.json({ ok: true }); // Acknowledge even if we can't find the order
    }

    if (resultCode === 0) {
      // ─── SUCCESS ───────────────────────────────────────────────
      // Extract receipt number + amount from CallbackMetadata.
      const metadata = stkCallback.CallbackMetadata?.Item || [];
      const receiptNo = metadata.find((i: { Name: string }) => i.Name === "MpesaReceiptNumber")?.Value;
      const amount = metadata.find((i: { Name: string }) => i.Name === "Amount")?.Value;

      await db.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          mpesaReceiptNo: String(receiptNo || ""),
        },
      });

      // Add a status event noting the payment.
      await db.statusEvent.create({
        data: {
          orderId: order.id,
          status: "PLACED",
          note: `M-Pesa payment received: ${String(receiptNo || "N/A")}${isSimulated ? " (simulated)" : ""}`,
        },
      });

      // SMS the shopper: payment confirmed.
      const shortId = shortOrderId(order.id);
      await sendSms(
        order.customerPhone,
        `HustleCart: Payment of KSh ${Math.round(order.total)} received for order #${shortId}. Receipt: ${receiptNo || "N/A"}. We're on it!`
      ).catch(() => {});

      // Notify the operator.
      await emitToOperator("order:new", {
        orderId: order.id,
        customerName: order.customerName,
        total: order.total,
        itemCount: 0,
        scheduledFor: null,
        paid: true,
        receipt: receiptNo,
      }).catch(() => {});

      console.log(`[mpesa/callback] Payment confirmed for order ${order.id}: receipt ${receiptNo}`);
    } else {
      // ─── FAILURE ───────────────────────────────────────────────
      await db.order.update({
        where: { id: order.id },
        data: { paymentStatus: "FAILED" },
      });

      await db.statusEvent.create({
        data: {
          orderId: order.id,
          status: "PLACED",
          note: `M-Pesa payment failed: ${resultDesc}`,
        },
      });

      console.log(`[mpesa/callback] Payment failed for order ${order.id}: ${resultDesc}`);
    }

    // Always acknowledge the callback (Daraja expects a 200).
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[mpesa/callback] error", e);
    // Still return 200 so Daraja doesn't retry.
    return NextResponse.json({ ok: true });
  }
}
