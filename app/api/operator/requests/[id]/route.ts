// PATCH /api/operator/requests/[id] — update status / quotedTotal / operatorNote.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { emitOrderStatus } from "@/lib/order-events";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (user.role !== "operator") {
    return NextResponse.json({ error: "Operator only" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await db.customRequest.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { status, quotedTotal, operatorNote } = body || {};

  const data: Record<string, unknown> = {};
  const VALID = ["NEW", "CONTACTED", "SHOPPING", "DELIVERED", "CANCELLED"];
  if (typeof status === "string" && VALID.includes(status.toUpperCase())) {
    data.status = status.toUpperCase();
  }
  if (quotedTotal === null || quotedTotal === "") {
    data.quotedTotal = null;
  } else if (typeof quotedTotal === "number" && Number.isFinite(quotedTotal) && quotedTotal >= 0) {
    data.quotedTotal = quotedTotal;
  }
  if (typeof operatorNote === "string") {
    data.operatorNote = operatorNote.trim() || null;
  }

  const updated = await db.customRequest.update({
    where: { id },
    data,
    select: {
      id: true,
      status: true,
      quotedTotal: true,
      operatorNote: true,
      updatedAt: true,
    },
  });

  // Emit a WebSocket event so any client viewing this request gets a live update.
  await emitOrderStatus({
    orderId: id,
    status: String(data.status || updated.status),
    note: typeof operatorNote === "string" ? operatorNote.trim() || null : null,
    updatedAt: updated.updatedAt.toISOString(),
  }).catch(() => {});

  return NextResponse.json({ request: updated });
}
