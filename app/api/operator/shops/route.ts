// GET /api/operator/shops — list all source shops the operator buys from.
// POST /api/operator/shops — create a new source shop.
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

  const shops = await db.sourceShop.findMany({
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

export async function POST(req: NextRequest) {
  const op = await requireOperator();
  if ("error" in op) return op.error;

  const body = await req.json();
  const { name, description, phone, location } = body || {};

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Shop name is required." }, { status: 400 });
  }

  const shop = await db.sourceShop.create({
    data: {
      name: name.trim(),
      description: typeof description === "string" ? description.trim() || null : null,
      phone: typeof phone === "string" ? phone.trim() || null : null,
      location: typeof location === "string" ? location.trim() || null : null,
    },
    select: { id: true, name: true, description: true, phone: true, location: true },
  });

  return NextResponse.json({ shop });
}
