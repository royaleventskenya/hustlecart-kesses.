// GET /api/products/[id]/reviews — list reviews + aggregate rating for a product.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const reviews = await db.review.findMany({
    where: { productId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      title: true,
      comment: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });

  const count = reviews.length;
  const avg = count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return NextResponse.json({ reviews, count, average: avg, distribution });
}
