// GET /api/referral — returns the shopper's referral code + how many people
// they've referred + how many bonus stamps they've earned.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { referralCode: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Count how many users were referred by this person's code.
  const referredCount = await db.user.count({
    where: { referredBy: dbUser.referralCode },
  });

  // Build the share link from the request origin.
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  // On the server, we can't access window — the client will build the link.

  return NextResponse.json({
    referralCode: dbUser.referralCode,
    referredCount,
    bonusStamps: referredCount, // 1 stamp per referral
    shareLink: `/?ref=${dbUser.referralCode}`,
  });
}
