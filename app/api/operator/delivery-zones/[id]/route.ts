// PATCH/DELETE /api/operator/delivery-zones/[id]
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
  const existing = await db.deliveryZone.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body?.name === "string" && body.name.trim().length >= 2) data.name = body.name.trim();
  if (typeof body?.description === "string") data.description = body.description.trim() || null;
  if (typeof body?.fee === "number" && Number.isFinite(body.fee) && body.fee >= 0) data.fee = body.fee;
  if (typeof body?.active === "boolean") data.active = body.active;
  const updated = await db.deliveryZone.update({ where: { id }, data });
  return NextResponse.json({ zone: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const op = await requireOperator();
  if ("error" in op) return op.error;
  const { id } = await params;
  const existing = await db.deliveryZone.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.deliveryZone.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
