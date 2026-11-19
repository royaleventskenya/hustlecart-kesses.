// GET /api/delivery-zones — public list of active delivery zones (for checkout).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const zones = await db.deliveryZone.findMany({
    where: { active: true },
    orderBy: { fee: "asc" }, // cheapest first at checkout
    select: { id: true, name: true, description: true, fee: true },
  });
  return NextResponse.json({ zones });
}
