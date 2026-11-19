// POST /api/orders/[id]/cancel — shopper cancels their own order.
// Only allowed if the order status is PLACED (not yet accepted by the operator).
// Restores stock for all items in the order.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { emitOrderStatus } from "@/lib/order-events";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    select: { id: true, status: true, customerId: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (order.customerId !== user.id) {
    return NextResponse.json({ error: "Not your order." }, { status: 403 });
  }

  if (order.status !== "PLACED") {
    return NextResponse.json(
      { error: "This order has already been accepted and can't be cancelled. Contact us if you need help." },
      { status: 400 }
    );
  }

  const updated = await db.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    await tx.statusEvent.create({
      data: { orderId: o.id, status: "CANCELLED", note: "Order cancelled by shopper." },
    });
    // Restore stock for each item.
    const items = await tx.orderItem.findMany({
      where: { orderId: id },
      select: { productId: true, quantity: true },
    });
    for (const it of items) {
      await tx.product.update({
        where: { id: it.productId },
        data: { stock: { increment: it.quantity } },
      });
    }
    return o;
  });

  // Notify the operator.
  await emitOrderStatus({
    orderId: updated.id,
    status: "CANCELLED",
    note: "Order cancelled by shopper.",
    updatedAt: updated.updatedAt.toISOString(),
  }).catch(() => {});

  return NextResponse.json({ ok: true, orderId: updated.id, status: "CANCELLED" });
}
