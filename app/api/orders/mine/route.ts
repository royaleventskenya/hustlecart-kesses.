// GET /api/orders/mine — the current shopper's orders, newest first.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  if (user.role !== "shopper") {
    // Vendors can also see their own customer orders via this endpoint if they
    // placed any as a shopper; otherwise we just return an empty list.
  }

  const orders = await db.order.findMany({
    where: { customerId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      total: true,
      deliveryFee: true,
      paymentMethod: true,
      paymentStatus: true,
      mpesaReceiptNo: true,
      deliveryLocation: true,
      createdAt: true,
      scheduledFor: true,
      items: {
        select: {
          id: true,
          name: true,
          price: true,
          quantity: true,
          productId: true,
          product: { select: { shop: { select: { id: true, name: true, phone: true } } } },
        },
      },
      statusEvents: {
        orderBy: { createdAt: "asc" },
        select: { id: true, status: true, note: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({ orders });
}
