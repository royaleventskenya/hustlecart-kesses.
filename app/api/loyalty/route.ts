// GET /api/loyalty — returns the shopper's current stamps + free delivery credits.
// POST /api/loyalty/redeem — converts 10 stamps into 1 free delivery credit.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { loyaltyStamps: true, freeDeliveryAvailable: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    stamps: dbUser.loyaltyStamps,
    freeDelivery: dbUser.freeDeliveryAvailable,
    stampsNeeded: Math.max(0, 10 - dbUser.loyaltyStamps % 10),
    canRedeem: dbUser.loyaltyStamps >= 10,
  });
}

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { loyaltyStamps: true, freeDeliveryAvailable: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (dbUser.loyaltyStamps < 10) {
    return NextResponse.json({ error: "You need 10 stamps to redeem." }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      loyaltyStamps: { decrement: 10 },
      freeDeliveryAvailable: { increment: 1 },
    },
    select: { loyaltyStamps: true, freeDeliveryAvailable: true },
  });

  return NextResponse.json({
    ok: true,
    stamps: updated.loyaltyStamps,
    freeDelivery: updated.freeDeliveryAvailable,
    message: "Redeemed! You now have 1 free delivery credit.",
  });
}
