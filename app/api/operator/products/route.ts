// GET /api/operator/products — list all products in the operator's catalog.
// POST /api/operator/products — create a new product (operator-curated).
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

async function requireOperator() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Not logged in" }, { status: 401 }) };
  if (user.role !== "operator") {
    return { error: NextResponse.json({ error: "Operator only" }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  const op = await requireOperator();
  if ("error" in op) return op.error;

  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      costPrice: true,
      originalPrice: true,
      stock: true,
      imageUrl: true,
      category: { select: { id: true, name: true, slug: true } },
      shop: { select: { id: true, name: true, location: true } },
      createdAt: true,
    },
  });

  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const op = await requireOperator();
  if ("error" in op) return op.error;

  const body = await req.json();
  const { name, description, price, costPrice, originalPrice, stock, categoryId, shopId, imageUrl } = body || {};

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Product name is required." }, { status: 400 });
  }
  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum <= 0) {
    return NextResponse.json({ error: "Enter a valid selling price." }, { status: 400 });
  }
  const costNum = costPrice == null || costPrice === "" ? null : Number(costPrice);
  if (costNum !== null && (!Number.isFinite(costNum) || costNum < 0)) {
    return NextResponse.json({ error: "Enter a valid cost price." }, { status: 400 });
  }
  const origNum = originalPrice == null || originalPrice === "" ? null : Number(originalPrice);
  if (origNum !== null && (!Number.isFinite(origNum) || origNum <= 0)) {
    return NextResponse.json({ error: "Enter a valid original price." }, { status: 400 });
  }
  if (origNum !== null && origNum <= priceNum) {
    return NextResponse.json(
      { error: "Original price must be higher than the selling price for a deal." },
      { status: 400 }
    );
  }
  const stockNum = Math.floor(Number(stock));
  if (!Number.isFinite(stockNum) || stockNum < 0) {
    return NextResponse.json({ error: "Enter a valid stock count." }, { status: 400 });
  }
  if (!categoryId || typeof categoryId !== "string") {
    return NextResponse.json({ error: "Pick a category." }, { status: 400 });
  }
  if (!shopId || typeof shopId !== "string") {
    return NextResponse.json({ error: "Pick a source shop." }, { status: 400 });
  }

  const category = await db.category.findUnique({ where: { id: categoryId } });
  if (!category) return NextResponse.json({ error: "Category not found." }, { status: 400 });
  const shop = await db.sourceShop.findUnique({ where: { id: shopId } });
  if (!shop) return NextResponse.json({ error: "Source shop not found." }, { status: 400 });

  const product = await db.product.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      price: priceNum,
      costPrice: costNum,
      originalPrice: origNum,
      stock: stockNum,
      imageUrl: imageUrl?.trim() || null,
      categoryId: category.id,
      shopId: shop.id,
    },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      costPrice: true,
      originalPrice: true,
      stock: true,
      imageUrl: true,
      category: { select: { id: true, name: true, slug: true } },
      shop: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ product });
}
