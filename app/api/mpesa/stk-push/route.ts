// POST /api/mpesa/stk-push — initiate M-Pesa STK push for an order.
// Body: { orderId, phone }
//
// Flow:
//   1. Shopper picks M-Pesa at checkout → order is created with paymentStatus=UNPAID
//   2. This endpoint initiates the STK push (or simulates in dev)
//   3. Order paymentStatus → PENDING
//   4. Daraja (or simulation) calls /api/mpesa/callback → paymentStatus → PAID
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { stkPush, isMpesaConfigured } from "@/lib/mpesa";
import { normalizePhone } from "@/lib/format";
import { emitOrderStatus } from "@/lib/order-events";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const body = await req.json();
    const orderId = typeof body?.orderId === "string" ? body.orderId : null;
    const phone = normalizePhone(body?.phone || "");

    if (!orderId) return NextResponse.json({ error: "Missing orderId." }, { status: 400 });
    if (!phone) return NextResponse.json({ error: "Enter a valid M-Pesa phone." }, { status: 400 });

    // Fetch the order + verify ownership.
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, total: true, paymentStatus: true, customerId: true, paymentMethod: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.customerId !== user.id) {
      return NextResponse.json({ error: "Not your order." }, { status: 403 });
    }
    if (order.paymentStatus === "PAID") {
      return NextResponse.json({ ok: true, alreadyPaid: true });
    }

    // Mark as PENDING while we initiate the push.
    await db.order.update({
      where: { id: orderId },
      data: { paymentStatus: "PENDING", mpesaPhone: phone },
    });

    // Build the callback URL (must be publicly reachable for real Daraja).
    // In dev/simulation mode, we call it locally.
    const callbackUrl = isMpesaConfigured()
      ? (process.env.DARAJA_CALLBACK_URL || `${req.nextUrl.origin}/api/mpesa/callback`)
      : `http://localhost:${process.env.PORT || 3000}/api/mpesa/callback`;

    const result = await stkPush(phone, order.total, orderId, callbackUrl);

    if (!result.ok) {
      // Mark as FAILED so the shopper can retry.
      await db.order.update({
        where: { id: orderId },
        data: { paymentStatus: "FAILED" },
      });
      return NextResponse.json({ error: result.error || "STK push failed." }, { status: 502 });
    }

    // Notify the operator that a payment is pending.
    await emitOrderStatus({
      orderId,
      status: "PLACED",
      note: result.simulated
        ? "M-Pesa payment simulated — auto-confirming in 3s."
        : "M-Pesa STK push sent — waiting for shopper to enter PIN.",
      updatedAt: new Date().toISOString(),
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      checkoutRequestId: result.checkoutRequestId,
      simulated: result.simulated,
      message: result.simulated
        ? "Simulated STK push — payment will auto-confirm in 3 seconds."
        : "STK push sent. Check your phone for the M-Pesa prompt.",
    });
  } catch (e) {
    console.error("[mpesa/stk-push] error", e);
    return NextResponse.json({ error: "Could not initiate payment." }, { status: 500 });
  }
}
