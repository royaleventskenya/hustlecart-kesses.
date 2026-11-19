// GET /api/operator/customers — list all shoppers who have placed at least one
// order, with their order count, total spent, last order date, and contact info.
// Sorted by total spent descending (best customers first).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (user.role !== "operator") {
    return NextResponse.json({ error: "Operator only" }, { status: 403 });
  }

  // Find all shoppers who have at least one order.
  const shoppers = await db.user.findMany({
    where: { role: "shopper", orders: { some: {} } },
    select: {
      id: true,
      name: true,
      phone: true,
      createdAt: true,
      orders: {
        select: {
          id: true,
          total: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  const customers = shoppers
    .map((s) => {
      const orderCount = s.orders.length;
      const totalSpent = s.orders
        .filter((o) => o.status === "DELIVERED")
        .reduce((sum, o) => sum + o.total, 0);
      const lastOrderAt = s.orders.reduce(
        (max, o) => (o.createdAt > max ? o.createdAt : max),
        new Date(0)
      );
      const completedOrders = s.orders.filter((o) => o.status === "DELIVERED").length;
      // Strip the orders array — we only need the aggregate stats for the list.
      const { orders: _o, ...rest } = s;
      return {
        ...rest,
        orderCount,
        completedOrders,
        totalSpent,
        lastOrderAt: lastOrderAt.getTime() > 0 ? lastOrderAt.toISOString() : null,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent || b.orderCount - a.orderCount);

  return NextResponse.json({ customers });
}
