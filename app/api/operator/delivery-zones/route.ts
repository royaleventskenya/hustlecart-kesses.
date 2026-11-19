// GET /api/operator/delivery-zones — list ALL zones (including inactive).
// POST /api/operator/delivery-zones — create a new zone.
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
  const zones = await db.deliveryZone.findMany({
    orderBy: { fee: "asc" },
    select: { id: true, name: true, description: true, fee: true, active: true, createdAt: true },
  });
  return NextResponse.json({ zones });
}

export async function POST(req: NextRequest) {
  const op = await requireOperator();
  if ("error" in op) return op.error;
  const body = await req.json();
  const { name, description, fee, active } = body || {};
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Zone name is required." }, { status: 400 });
  }
  const feeNum = Number(fee);
  if (!Number.isFinite(feeNum) || feeNum < 0) {
    return NextResponse.json({ error: "Enter a valid delivery fee." }, { status: 400 });
  }
  const zone = await db.deliveryZone.create({
    data: {
      name: name.trim(),
      description: typeof description === "string" ? description.trim() || null : null,
      fee: feeNum,
      active: typeof active === "boolean" ? active : true,
    },
  });
  return NextResponse.json({ zone });
}
