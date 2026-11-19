// PATCH/DELETE /api/operator/products/[id] — update or delete a product.
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const op = await requireOperator();
  if ("error" in op) return op.error;

  const { id } = await params;
  const existing = await db.product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, description, price, costPrice, originalPrice, stock, categoryId, shopId, imageUrl } = body || {};

  const data: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim().length >= 2) data.name = name.trim();
  if (typeof description === "string") data.description = description.trim() || null;
  if (typeof price === "number" && Number.isFinite(price) && price > 0) data.price = price;
  if (costPrice === null || costPrice === "") {
    data.costPrice = null;
  } else if (typeof costPrice === "number" && Number.isFinite(costPrice) && costPrice >= 0) {
    data.costPrice = costPrice;
  }
  if (originalPrice === null || originalPrice === "") {
    data.originalPrice = null;
  } else if (typeof originalPrice === "number" && Number.isFinite(originalPrice) && originalPrice > 0) {
    data.originalPrice = originalPrice;
  }
  if (typeof stock === "number" && Number.isFinite(stock) && stock >= 0) data.stock = Math.floor(stock);
  if (typeof imageUrl === "string") data.imageUrl = imageUrl.trim() || null;
  if (typeof categoryId === "string" && categoryId.length > 0) {
    const cat = await db.category.findUnique({ where: { id: categoryId } });
    if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 400 });
    data.categoryId = cat.id;
  }
  if (typeof shopId === "string" && shopId.length > 0) {
    const shop = await db.sourceShop.findUnique({ where: { id: shopId } });
    if (!shop) return NextResponse.json({ error: "Source shop not found" }, { status: 400 });
    data.shopId = shop.id;
  }

  const updated = await db.product.update({
    where: { id },
    data,
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
  return NextResponse.json({ product: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const op = await requireOperator();
  if ("error" in op) return op.error;

  const { id } = await params;
  const existing = await db.product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
