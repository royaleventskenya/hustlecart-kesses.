// POST /api/reviews — submit a review for a product.
// Body: { productId, rating (1..5), title?, comment? }
// Auth required (shopper). One review per user per product (enforced by DB).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to leave a review." }, { status: 401 });
  }

  const body = await req.json();
  const productId = typeof body?.productId === "string" ? body.productId : null;
  const rating = Math.floor(Number(body?.rating));
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : null;
  const comment = typeof body?.comment === "string" ? body.comment.trim().slice(0, 2000) : null;

  if (!productId) {
    return NextResponse.json({ error: "Missing productId." }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  }
  if (!title && !comment) {
    return NextResponse.json(
      { error: "Add a title or comment for your review." },
      { status: 400 }
    );
  }

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  // One review per user per product — upsert so they can update their existing review.
  const review = await db.review.upsert({
    where: {
      productId_userId: { productId, userId: user.id },
    },
    update: { rating, title: title || null, comment: comment || null },
    create: { productId, userId: user.id, rating, title: title || null, comment: comment || null },
    select: {
      id: true,
      rating: true,
      title: true,
      comment: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });

  return NextResponse.json({ review });
}
