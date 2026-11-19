// GET /api/operator/requests — list all custom requests, newest first.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (user.role !== "operator") {
    return NextResponse.json({ error: "Operator only" }, { status: 403 });
  }

  const requests = await db.customRequest.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      shopperName: true,
      shopperPhone: true,
      itemsText: true,
      location: true,
      status: true,
      operatorNote: true,
      quotedTotal: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ requests });
}
