// GET /api/operator/daily-summary — today's stats for the operator.
// Returns: today's order count, revenue, profit, delivered count, pending count,
// top-selling items (by quantity), and a text summary suitable for sharing.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { formatKES, formatDateShort, shortOrderId } from "@/lib/format";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (user.role !== "operator") {
    return NextResponse.json({ error: "Operator only" }, { status: 403 });
  }

  // Today's date range (from midnight to now).
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todayOrders = await db.order.findMany({
    where: { createdAt: { gte: todayStart } },
    select: {
      id: true,
      status: true,
      total: true,
      deliveryFee: true,
      customerName: true,
      deliveryZoneName: true,
      items: { select: { name: true, price: true, costPrice: true, quantity: true } },
    },
  });

  const orderCount = todayOrders.length;
  const deliveredCount = todayOrders.filter((o) => o.status === "DELIVERED").length;
  const pendingCount = todayOrders.filter(
    (o) => o.status !== "DELIVERED" && o.status !== "CANCELLED"
  ).length;
  const cancelledCount = todayOrders.filter((o) => o.status === "CANCELLED").length;

  const revenue = todayOrders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((s, o) => s + o.total, 0);

  const profit = todayOrders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((s, o) => {
      const goodsCost = o.items.reduce((cs, it) => cs + (it.costPrice ?? 0) * it.quantity, 0);
      return s + o.total - goodsCost;
    }, 0);

  // Top-selling items by quantity today.
  const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const o of todayOrders) {
    for (const it of o.items) {
      const existing = itemMap.get(it.name);
      if (existing) {
        existing.quantity += it.quantity;
        existing.revenue += it.price * it.quantity;
      } else {
        itemMap.set(it.name, { name: it.name, quantity: it.quantity, revenue: it.price * it.quantity });
      }
    }
  }
  const topItems = Array.from(itemMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // Also fetch today's quick requests.
  const todayRequests = await db.customRequest.findMany({
    where: { createdAt: { gte: todayStart } },
    select: { id: true, status: true, shopperName: true },
  });
  const requestCount = todayRequests.length;

  // Build a text summary for sharing via WhatsApp.
  const dateStr = formatDateShort(now.toISOString());
  const lines: string[] = [
    `📊 HustleCart Kesses — Daily Summary`,
    `📅 ${dateStr}`,
    ``,
    `Orders: ${orderCount} (${deliveredCount} delivered, ${pendingCount} pending${cancelledCount > 0 ? `, ${cancelledCount} cancelled` : ""})`,
    `Quick orders: ${requestCount}`,
    `Revenue: ${formatKES(revenue)}`,
    `Profit: ${formatKES(profit)}`,
    ``,
  ];
  if (topItems.length > 0) {
    lines.push(`Top items today:`);
    for (const it of topItems.slice(0, 5)) {
      lines.push(`  • ${it.name} — ${it.quantity}× (${formatKES(it.revenue)})`);
    }
  }
  const textSummary = lines.join("\n");

  return NextResponse.json({
    date: todayStart.toISOString(),
    orderCount,
    deliveredCount,
    pendingCount,
    cancelledCount,
    requestCount,
    revenue,
    profit,
    topItems,
    orders: todayOrders.map((o) => ({
      id: o.id,
      shortId: shortOrderId(o.id),
      status: o.status,
      total: o.total,
      customerName: o.customerName,
      deliveryZoneName: o.deliveryZoneName,
      itemCount: o.items.reduce((s, it) => s + it.quantity, 0),
    })),
    textSummary,
  });
}
