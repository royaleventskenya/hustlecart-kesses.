// GET /api/operator/shopping-list — consolidates all items the operator needs
// to buy across ACCEPTED + SHOPPING orders. Grouped by source shop, with
// aggregated quantities per product. Also includes all custom requests in
// those statuses (so the operator has the free-text lists too).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (user.role !== "operator") {
    return NextResponse.json({ error: "Operator only" }, { status: 403 });
  }

  // Active catalog orders (items come from products with a known source shop).
  const activeOrders = await db.order.findMany({
    where: { status: { in: ["ACCEPTED", "SHOPPING"] } },
    select: {
      id: true,
      items: {
        select: {
          productId: true,
          name: true,
          quantity: true,
          product: {
            select: {
              shop: { select: { id: true, name: true, location: true } },
            },
          },
        },
      },
    },
  });

  // Aggregate items per (sourceShopId, productId, name).
  // Key format: `${shopId}|${productId}` -> { shop, product name, totalQty, orderIds[] }
  const agg = new Map<
    string,
    {
      shopId: string;
      shopName: string;
      shopLocation: string | null;
      productName: string;
      productId: string;
      totalQty: number;
      orderIds: string[];
    }
  >();

  for (const o of activeOrders) {
    for (const it of o.items) {
      const shopId = it.product.shop.id;
      const key = `${shopId}|${it.productId}`;
      const existing = agg.get(key);
      if (existing) {
        existing.totalQty += it.quantity;
        if (!existing.orderIds.includes(o.id)) existing.orderIds.push(o.id);
      } else {
        agg.set(key, {
          shopId,
          shopName: it.product.shop.name,
          shopLocation: it.product.shop.location,
          productName: it.name,
          productId: it.productId,
          totalQty: it.quantity,
          orderIds: [o.id],
        });
      }
    }
  }

  // Group by source shop.
  const byShop = new Map<
    string,
    {
      shopId: string;
      shopName: string;
      shopLocation: string | null;
      items: typeof agg extends Map<string, infer V> ? V[] : never;
    }
  >();
  for (const item of agg.values()) {
    const shop = byShop.get(item.shopId);
    if (shop) {
      shop.items.push(item);
    } else {
      byShop.set(item.shopId, {
        shopId: item.shopId,
        shopName: item.shopName,
        shopLocation: item.shopLocation,
        items: [item],
      });
    }
  }

  // Active custom requests (free-text lists).
  const activeRequests = await db.customRequest.findMany({
    where: { status: { in: ["NEW", "CONTACTED", "SHOPPING"] } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      shopperName: true,
      shopperPhone: true,
      itemsText: true,
      location: true,
      status: true,
      quotedTotal: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    shops: Array.from(byShop.values()),
    customRequests: activeRequests,
    orderCount: activeOrders.length,
    itemCount: agg.size,
  });
}
