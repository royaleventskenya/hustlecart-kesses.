// POST /api/auth/send-code
// Body: { phone, role, name }
// Generates a random 4-digit OTP, stores it in memory, and sends it via
// Africa's Talking if credentials are configured. In development mode (no
// creds), the random code is returned to the client so it can be surfaced in
// a clearly-labeled "Development mode" banner.
import { NextRequest, NextResponse } from "next/server";
import { normalizePhone } from "@/lib/format";
import { saveOtp, checkRateLimit } from "@/lib/otp-store";
import { generateOtp, sendOtpSms } from "@/lib/sms";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = normalizePhone(body?.phone || "");
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!phone) {
      return NextResponse.json(
        { error: "Please enter a valid Kenyan phone number, e.g. +254 712 000001." },
        { status: 400 }
      );
    }
    if (name.length < 2) {
      return NextResponse.json(
        { error: "Please enter your full name (at least 2 characters)." },
        { status: 400 }
      );
    }

    // Role is determined at verify time by the pinned OPERATOR_PHONE in verify/route.ts.
    // For OTP storage we use "shopper" as a placeholder; verify will overwrite
    // it with "operator" if the phone matches.
    const role: "shopper" | "operator" = "shopper";

    const rl = checkRateLimit(phone);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Please wait ${rl.waitSec}s before requesting a new code.` },
        { status: 429 }
      );
    }

    // Always generate a random code — no hardcoded value.
    const code = generateOtp();
    saveOtp(phone, code, name, role);

    const smsResult = await sendOtpSms(phone, code);

    if (!smsResult.ok) {
      return NextResponse.json(
        {
          error: `Could not send SMS: ${smsResult.error || "unknown error"}. Try again.`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      devMode: smsResult.devMode,
      // Only return the code to the client when in DEVELOPMENT mode (SMS not
      // configured). In production, the code is only delivered via SMS.
      devCode: smsResult.devMode ? smsResult.devCode : undefined,
      ttlSeconds: 300,
    });
  } catch (e) {
    console.error("[auth/send-code] error", e);
    return NextResponse.json(
      { error: "Could not send the code. Try again." },
      { status: 500 }
    );
  }
}
