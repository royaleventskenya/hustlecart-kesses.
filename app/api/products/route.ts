// GET /api/products?category=<slug>&q=<search>&deals=true&sort=<featured|price-asc|price-desc|rating|newest>
// Returns products with shop name + category slug + review stats (avg, count) + deal info.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type SortKey = "featured" | "price-asc" | "price-desc" | "rating" | "newest";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const category = sp.get("category"); // slug
  const q = sp.get("q")?.trim() ?? "";
  const dealsOnly = sp.get("deals") === "true";
  const sortParam = (sp.get("sort") || "featured") as SortKey;

  // Build the where clause
  const where: Record<string, unknown> = { AND: [] };
  if (category) (where.AND as unknown[]).push({ category: { slug: category } });
  if (q) (where.AND as unknown[]).push({ name: { contains: q } });
  if (dealsOnly) (where.AND as unknown[]).push({ originalPrice: { not: null } });

  // orderBy — rating sort needs a sub-query so we fall back to featured for that
  let orderBy: Record<string, "asc" | "desc"> | undefined;
  switch (sortParam) {
    case "price-asc": orderBy = { price: "asc" }; break;
    case "price-desc": orderBy = { price: "desc" }; break;
    case "newest": orderBy = { createdAt: "desc" }; break;
    default: orderBy = { name: "asc" };
  }

  const products = await db.product.findMany({
    where: where as never,
    orderBy,
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      originalPrice: true,
      stock: true,
      imageUrl: true,
      category: { select: { id: true, name: true, slug: true } },
      shop: { select: { id: true, name: true, phone: true } },
      reviews: { select: { rating: true } },
    },
  });

  // Compute aggregate rating + discount % per product, then optionally re-sort
  // by rating (since SQLite can't easily do that via orderBy).
  const enriched = products.map((p) => {
    const reviewCount = p.reviews.length;
    const avgRating =
      reviewCount > 0 ? p.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount : 0;
    const discountPct =
      p.originalPrice && p.originalPrice > p.price
        ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
        : 0;
    // strip the raw reviews array from the response
    const { reviews: _r, ...rest } = p;
    return { ...rest, reviewCount, avgRating, discountPct };
  });

  if (sortParam === "rating") {
    enriched.sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount);
  }

  return NextResponse.json({ products: enriched });
}
