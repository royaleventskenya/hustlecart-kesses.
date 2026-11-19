// GET /api/shops — list all shops
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const shops = await db.shop.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      phone: true,
      location: true,
      _count: { select: { products: true } },
    },
  });
  return NextResponse.json({
    shops: shops.map((s) => ({ ...s, productCount: s._count.products })),
  });
}
