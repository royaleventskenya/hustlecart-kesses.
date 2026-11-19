// GET /api/products/[id] — single product with shop + category + review stats
// + the operator's contact phone (for the shopper's "Chat with HustleCart" button).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      originalPrice: true,
      stock: true,
      imageUrl: true,
      category: { select: { id: true, name: true, slug: true } },
      shop: { select: { id: true, name: true, phone: true, location: true, description: true } },
      reviews: { select: { rating: true } },
    },
  });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Look up the operator's phone (the single user with role "operator").
  // Used by the shopper to chat about this product / place a custom request.
  const operator = await db.user.findFirst({
    where: { role: "operator" },
    select: { phone: true, name: true },
  });

  const reviewCount = product.reviews.length;
  const avgRating =
    reviewCount > 0
      ? product.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount
      : 0;
  const discountPct =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;
  const { reviews: _r, ...rest } = product;
  return NextResponse.json({
    product: { ...rest, reviewCount, avgRating, discountPct },
    operatorPhone: operator?.phone ?? null,
    operatorName: operator?.name ?? "HustleCart",
  });
}
