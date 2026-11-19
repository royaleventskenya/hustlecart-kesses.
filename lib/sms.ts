// Africa's Talking SMS client wrapper.
//
// Env vars (see .env.example):
//   AFRICASTALKING_USERNAME  — "sandbox" for testing, or your production username
//   AFRICASTALKING_API_KEY   — your API key from the dashboard
//   AFRICASTALKING_SENDER_ID — (optional) alphanumeric sender ID; required for production
//
// Behavior:
//   - When credentials ARE set: a random 4-digit code is generated and sent via
//     Africa's Talking. The code is NOT returned to the client (only delivered
//     via SMS).
//   - When credentials are NOT set: the app is in DEVELOPMENT mode. A random
//     code is still generated (no hardcoded code), and the code is logged
//     server-side AND returned to the client so it can be displayed in a
//     clearly-labeled "Development mode" banner. In production this branch
//     never runs.

const SANDBOX_URL = "https://api.safaricom.staging.africastalking.com";
const PROD_URL = "https://api.africastalking.com";
const SMS_ENDPOINT = "/version1/messaging";

export function isSmsConfigured(): boolean {
  const username = process.env.AFRICASTALKING_USERNAME;
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  return Boolean(username && apiKey);
}

export function isSandbox(): boolean {
  return process.env.AFRICASTALKING_USERNAME === "sandbox";
}

/** Generate a random 4-digit OTP. */
export function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Send an OTP via Africa's Talking. Returns:
 *   { ok, devMode, devCode?, error? }
 * - devMode=true means SMS is NOT configured; the code is returned as
 *   `devCode` so the caller can surface it in a clearly-labeled dev banner.
 *   This branch only runs when AFRICASTALKING_* env vars are missing.
 * - devMode=false means we attempted a real send; check `ok` for success.
 */
export async function sendOtpSms(
  phone: string,
  code: string
): Promise<{ ok: boolean; devMode: boolean; devCode?: string; error?: string }> {
  if (!isSmsConfigured()) {
    // DEVELOPMENT MODE: SMS gateway not configured.
    // Log the code server-side so it shows up in dev.log for terminal testing.
    console.log(`[SMS DEV] OTP for ${phone}: ${code} (SMS gateway not configured)`);
    return { ok: true, devMode: true, devCode: code };
  }

  const username = process.env.AFRICASTALKING_USERNAME!;
  const apiKey = process.env.AFRICASTALKING_API_KEY!;
  const senderId = process.env.AFRICASTALKING_SENDER_ID || (isSandbox() ? "AT" : "HUSTLECRT");
  const baseUrl = isSandbox() ? SANDBOX_URL : PROD_URL;

  const message = `Your HustleCart Kesses code is ${code}. It expires in 5 minutes. Do not share it.`;

  try {
    const body = new URLSearchParams({
      username,
      to: phone,
      message,
      from: senderId,
    });
    const res = await fetch(`${baseUrl}${SMS_ENDPOINT}`, {
      method: "POST",
      headers: {
        apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, devMode: false, error: `SMS gateway returned ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = await res.json().catch(() => null);
    const recipients = (data as any)?.SMSMessageData?.Recipients ?? [];
    if (Array.isArray(recipients) && recipients.length > 0) {
      const status = recipients[0].status;
      if (status && String(status).toLowerCase() !== "success") {
        return { ok: false, devMode: false, error: `SMS gateway: ${status}` };
      }
    }
    return { ok: true, devMode: false };
  } catch (e) {
    return {
      ok: false,
      devMode: false,
      error: e instanceof Error ? e.message : "Network error sending SMS",
    };
  }
}

/**
 * Send a generic SMS (not an OTP) — used for order-status notifications.
 * e.g. "HustleCart: Your order #AB1234 is now ACCEPTED. We're on it!"
 *
 * If SMS isn't configured (dev mode), the message is logged server-side but
 * NOT returned to the client (order notifications should never be surfaced
 * in the UI — they're for the shopper's phone, not the operator's screen).
 */
export async function sendSms(
  phone: string,
  message: string
): Promise<{ ok: boolean; devMode: boolean; error?: string }> {
  if (!isSmsConfigured()) {
    // DEVELOPMENT MODE: log the message so it shows up in dev.log.
    console.log(`[SMS DEV] To ${phone}: ${message}`);
    return { ok: true, devMode: true };
  }

  const username = process.env.AFRICASTALKING_USERNAME!;
  const apiKey = process.env.AFRICASTALKING_API_KEY!;
  const senderId = process.env.AFRICASTALKING_SENDER_ID || (isSandbox() ? "AT" : "HUSTLECRT");
  const baseUrl = isSandbox() ? SANDBOX_URL : PROD_URL;

  try {
    const body = new URLSearchParams({
      username,
      to: phone,
      message,
      from: senderId,
    });
    const res = await fetch(`${baseUrl}${SMS_ENDPOINT}`, {
      method: "POST",
      headers: {
        apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, devMode: false, error: `SMS gateway returned ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = await res.json().catch(() => null);
    const recipients = (data as any)?.SMSMessageData?.Recipients ?? [];
    if (Array.isArray(recipients) && recipients.length > 0) {
      const status = recipients[0].status;
      if (status && String(status).toLowerCase() !== "success") {
        return { ok: false, devMode: false, error: `SMS gateway: ${status}` };
      }
    }
    return { ok: true, devMode: false };
  } catch (e) {
    return {
      ok: false,
      devMode: false,
      error: e instanceof Error ? e.message : "Network error sending SMS",
    };
  }
}
