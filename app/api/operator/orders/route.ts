// GET /api/operator/orders — all orders, newest first.
// Operator sees ALL orders (they fulfill them all).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (user.role !== "operator") {
    return NextResponse.json({ error: "Operator only" }, { status: 403 });
  }

  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      deliveryPhotoUrl: true,
      total: true,
      deliveryFee: true,
      customerName: true,
      customerPhone: true,
      deliveryLocation: true,
      deliveryLat: true,
      deliveryLng: true,
      paymentMethod: true,
      paymentStatus: true,
      mpesaReceiptNo: true,
      createdAt: true,
      scheduledFor: true,
      items: {
        select: {
          id: true,
          name: true,
          price: true,
          costPrice: true,
          quantity: true,
          productId: true,
        },
      },
      statusEvents: {
        orderBy: { createdAt: "asc" },
        select: { id: true, status: true, note: true, createdAt: true },
      },
    },
  });

  // Compute profit per order = sum((price - costPrice) * qty) + deliveryFee.
  const enriched = orders.map((o) => {
    const productProfit = o.items.reduce((sum, it) => {
      const cp = it.costPrice ?? 0;
      return sum + (it.price - cp) * it.quantity;
    }, 0);
    const profit = productProfit + o.deliveryFee;
    return { ...o, profit };
  });

  return NextResponse.json({ orders: enriched });
}
