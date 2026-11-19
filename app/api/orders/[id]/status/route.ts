// PATCH /api/orders/[id]/status — operator advances the order status.
// Body: { status, note? }
//
// New status flow (personal shopping + delivery service):
//   PLACED -> ACCEPTED -> SHOPPING -> OUT_FOR_DELIVERY -> DELIVERED
//   (or CANCELLED at any point)
//
// After a successful DB update:
//   1. Emits an `order:status` event via WebSocket (live tracking page update)
//   2. Sends an SMS to the shopper via Africa's Talking (so they know even if
//      they don't have the app open)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { emitOrderStatus } from "@/lib/order-events";
import { sendSms } from "@/lib/sms";
import { shortOrderId } from "@/lib/format";

const VALID_STATUSES = ["ACCEPTED", "SHOPPING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

// Status-specific notes for the shopper timeline (shown in the tracking page).
const DEFAULT_NOTES: Record<string, string> = {
  ACCEPTED: "HustleCart accepted your order. We're on it!",
  SHOPPING: "Your personal shopper is buying your items at the source shop.",
  OUT_FOR_DELIVERY: "Operator is on the way to you with your order.",
  DELIVERED: "Delivered. Thank you for using HustleCart Kesses!",
  CANCELLED: "Order cancelled.",
};

// SMS messages sent to the shopper's phone when status changes.
// Kept short to fit within a single SMS (160 chars).
const SMS_MESSAGES: Record<string, (shortId: string) => string> = {
  ACCEPTED: (id) => `HustleCart: Order #${id} accepted! We're on it.`,
  SHOPPING: (id) => `HustleCart: We're now shopping for your order #${id}.`,
  OUT_FOR_DELIVERY: (id) => `HustleCart: Order #${id} is on the way! Heading to you now.`,
  DELIVERED: (id) => `HustleCart: Order #${id} delivered! Please pay cash on delivery. Asante!`,
  CANCELLED: (id) => `HustleCart: Order #${id} has been cancelled. Questions? Reply to this SMS.`,
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (user.role !== "operator") {
    return NextResponse.json({ error: "Operator only" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const status = String(body?.status || "").toUpperCase();
  const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim() : null;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const order = await db.order.findUnique({
    where: { id },
    select: { id: true, status: true, customerPhone: true, customerId: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const updated = await db.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id },
      data: { status },
    });
    await tx.statusEvent.create({
      data: { orderId: o.id, status, note: note ?? DEFAULT_NOTES[status] ?? null },
    });
    // Loyalty: give the shopper a stamp when their order is delivered.
    if (status === "DELIVERED") {
      await tx.user.update({
        where: { id: order.customerId },
        data: { loyaltyStamps: { increment: 1 } },
      });
    }
    return o;
  });

  // 1. Live WebSocket update (for shoppers with the tracking page open).
  await emitOrderStatus({
    orderId: updated.id,
    status: updated.status,
    note: note ?? DEFAULT_NOTES[status] ?? null,
    updatedAt: updated.updatedAt.toISOString(),
  });

  // 2. SMS notification to the shopper (so they know even without the app open).
  // Non-fatal — if SMS fails, the order still updated successfully.
  const smsFn = SMS_MESSAGES[status];
  if (smsFn && order.customerPhone) {
    const shortId = shortOrderId(updated.id);
    const smsResult = await sendSms(order.customerPhone, smsFn(shortId));
    if (!smsResult.ok) {
      console.warn(`[order-status SMS] failed for ${order.customerPhone}:`, smsResult.error);
    }
  }

  return NextResponse.json({ orderId: updated.id, status: updated.status });
}
