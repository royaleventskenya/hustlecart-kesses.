// POST /api/auth/verify
// Body: { phone, code }
// Verifies the OTP against the in-memory store. On success: upserts the user
// (using the name they entered when requesting the code) and sets the session
// cookie. The OTP is one-shot — it's consumed on success and can't be reused.
//
// Role assignment:
//   - If the phone matches HUSTLECART_OPERATOR_PHONE env var, role = "operator".
//   - Otherwise role = "shopper".
// There is no "vendor" role anymore — HustleCart Kesses is a personal
// shopping + delivery service run by a single operator.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/format";
import { consumeOtp, hasOtp } from "@/lib/otp-store";

function getOperatorPhone(): string | null {
  const v = process.env.HUSTLECART_OPERATOR_PHONE;
  return v ? normalizePhone(v) : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone: rawPhone, code, referredBy } = body || {};
    const phone = normalizePhone(rawPhone || "");
    if (!phone) {
      return NextResponse.json(
        { error: "Please enter a valid Kenyan phone number." },
        { status: 400 }
      );
    }
    if (!code || String(code).length !== 4) {
      return NextResponse.json(
        { error: "Enter the 4-digit code we sent you." },
        { status: 400 }
      );
    }

    const stored = consumeOtp(phone, String(code));
    if (!stored) {
      const stillHas = hasOtp(phone);
      return NextResponse.json(
        {
          error: stillHas
            ? "Wrong code. Check your SMS and try again."
            : "Code expired or not requested. Send a new one.",
        },
        { status: 400 }
      );
    }

    // Determine role: operator phone -> operator; otherwise shopper.
    const operatorPhone = getOperatorPhone();
    const role: "shopper" | "operator" =
      operatorPhone && phone === operatorPhone ? "operator" : "shopper";

    const user = await db.user.upsert({
      where: { phone },
      update: { name: stored.name, role },
      create: {
        phone,
        role,
        name: stored.name,
        // Store the referral code if this is a new user and a valid ref code is provided.
        referredBy: typeof referredBy === "string" && referredBy.trim() ? referredBy.trim() : null,
      },
      select: { id: true, phone: true, name: true, role: true, referralCode: true },
    });

    const res = NextResponse.json({ user });
    res.cookies.set("hc_session", user.id, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
    return res;
  } catch (e) {
    console.error("[auth/verify] error", e);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
