// GET /api/orders/[id] — single order with items + statusEvents + operator phone.
// The operator phone is used by the shopper to chat about their order.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      deliveryPhotoUrl: true,
      total: true,
      deliveryFee: true,
      paymentMethod: true,
      paymentStatus: true,
      mpesaReceiptNo: true,
      mpesaPhone: true,
      deliveryLocation: true,
      deliveryLat: true,
      deliveryLng: true,
      customerName: true,
      customerPhone: true,
      createdAt: true,
      updatedAt: true,
      scheduledFor: true,
      customerId: true,
      items: {
        select: {
          id: true,
          name: true,
          price: true,
          quantity: true,
          productId: true,
          product: {
            select: {
              shop: { select: { id: true, name: true, phone: true } },
            },
          },
        },
      },
      statusEvents: {
        orderBy: { createdAt: "asc" },
        select: { id: true, status: true, note: true, createdAt: true },
      },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  // Permission: shopper must own it OR operator can view any order.
  if (user.role === "shopper" && order.customerId !== user.id) {
    return NextResponse.json({ error: "Not your order" }, { status: 403 });
  }
  // Look up the operator's phone for the WhatsApp chat button.
  const operator = await db.user.findFirst({
    where: { role: "operator" },
    select: { phone: true, name: true },
  });
  return NextResponse.json({
    order,
    operatorPhone: operator?.phone ?? null,
    operatorName: operator?.name ?? "HustleCart",
  });
}
