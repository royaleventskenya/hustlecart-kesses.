// GET /api/operator/earnings — summary stats + last-7-days order counts.
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
    select: {
      id: true,
      status: true,
      total: true,
      deliveryFee: true,
      createdAt: true,
      items: { select: { price: true, costPrice: true, quantity: true } },
    },
  });

  let revenue = 0;       // total order value (what customers pay)
  let profit = 0;        // revenue - cost of goods (markup + delivery fees)
  let pendingCount = 0;
  let deliveredCount = 0;

  for (const o of orders) {
    revenue += o.total;
    const goodsCost = o.items.reduce((s, it) => s + (it.costPrice ?? 0) * it.quantity, 0);
    profit += o.total - goodsCost; // total includes delivery fee already
    if (o.status === "DELIVERED") deliveredCount++;
    if (o.status !== "DELIVERED" && o.status !== "CANCELLED") pendingCount++;
  }

  // 7-day chart: count of orders created per day
  const now = new Date();
  const days: { label: string; key: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ label: d.toLocaleDateString("en-KE", { weekday: "short" }), key, count: 0 });
  }
  const map = new Map(days.map((d) => [d.key, d]));
  for (const o of orders) {
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    const bucket = map.get(key);
    if (bucket) bucket.count += 1;
  }

  return NextResponse.json({
    stats: {
      totalOrders: orders.length,
      pendingOrders: pendingCount,
      deliveredOrders: deliveredCount,
      revenue,
      profit,
    },
    chart: days,
  });
}
