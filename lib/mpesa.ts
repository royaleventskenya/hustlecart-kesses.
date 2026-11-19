// HustleCart Kesses — M-Pesa Daraja API client.
//
// Supports the Lipa Na M-Pesa Online (STK Push) flow:
//   1. Shopper picks M-Pesa at checkout → enters their M-Pesa phone
//   2. Backend calls stkPush() → Daraja sends an STK push prompt to the shopper
//   3. Shopper enters M-Pesa PIN on their phone
//   4. Daraja calls our /api/mpesa/callback endpoint with the result
//   5. If successful, we mark the order as PAID + record the receipt number
//
// Env vars (see .env.example):
//   DARAJA_CONSUMER_KEY     — from developer.safaricom.co.ke
//   DARAJA_CONSUMER_SECRET  — from developer.safaricom.co.ke
//   DARAJA_PASSKEY          — Lipa Na M-Pesa passkey
//   DARAJA_SHORTCODE        — paybill/till number (174379 for sandbox)
//   DARAJA_CALLBACK_URL     — public URL Daraja calls after payment (must be HTTPS)
//
// When credentials are NOT set, the app runs in SIMULATION mode:
//   - stkPush() returns a fake CheckoutRequestID
//   - After 3 seconds, the callback is auto-called with a simulated success
//   - This lets you test the full flow without real Daraja credentials

const SANDBOX_BASE = "https://sandbox.safaricom.co.ke";
const PROD_BASE = "https://api.safaricom.co.ke";

export function isMpesaConfigured(): boolean {
  return Boolean(
    process.env.DARAJA_CONSUMER_KEY &&
    process.env.DARAJA_CONSUMER_SECRET &&
    process.env.DARAJA_PASSKEY &&
    process.env.DARAJA_SHORTCODE
  );
}

function getBaseUrl(): string {
  // Sandbox if the shortcode is the sandbox default (174379) or if explicitly set.
  const shortcode = process.env.DARAJA_SHORTCODE || "";
  if (shortcode === "174379" || process.env.DARAJA_ENV === "sandbox") {
    return SANDBOX_BASE;
  }
  return PROD_BASE;
}

/** Get an OAuth access token from Daraja. */
async function getAccessToken(): Promise<string> {
  const key = process.env.DARAJA_CONSUMER_KEY!;
  const secret = process.env.DARAJA_CONSUMER_SECRET!;
  const base = getBaseUrl();
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");

  const res = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Daraja auth failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.access_token;
}

/** Generate the password for STK push (base64(shortcode + passkey + timestamp)). */
function generatePassword(shortcode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

/** Format current time as YYYYMMDDHHmmss (Daraja format). */
function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    String(now.getFullYear()) +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

export type StkPushResult = {
  ok: boolean;
  checkoutRequestId: string;
  simulated: boolean;
  error?: string;
};

/**
 * Initiate an M-Pesa STK push. Sends a payment prompt to the shopper's phone.
 *
 * In dev mode (no Daraja credentials), this SIMULATES the push:
 *   - Returns a fake CheckoutRequestID
 *   - Schedules an auto-confirmation after 3 seconds
 *   - The caller's callback endpoint receives the simulated result
 */
export async function stkPush(
  phone: string,
  amount: number,
  orderId: string,
  callbackUrl: string
): Promise<StkPushResult> {
  if (!isMpesaConfigured()) {
    // ─── SIMULATION MODE ───────────────────────────────────────────
    // Generate a fake checkout request ID + schedule a simulated callback.
    const fakeId = `ws_sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const fakeReceipt = `SIM${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    console.log(`[M-PESA SIM] STK push for ${phone}, KSh ${amount}, order ${orderId}`);
    console.log(`[M-PESA SIM] Will auto-confirm in 3s with receipt ${fakeReceipt}`);

    // Schedule the simulated callback after 3 seconds.
    setTimeout(async () => {
      try {
        console.log(`[M-PESA SIM] Auto-confirming payment for order ${orderId}`);
        await fetch(callbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Body: {
              stkCallback: {
                CheckoutRequestID: fakeId,
                ResultCode: 0, // 0 = success
                ResultDesc: "The service request is processed successfully.",
                CallbackMetadata: {
                  Item: [
                    { Name: "Amount", Value: amount },
                    { Name: "MpesaReceiptNumber", Value: fakeReceipt },
                    { Name: "PhoneNumber", Value: phone },
                  ],
                },
              },
            },
            // Custom field so the callback knows this is simulated.
            _simulated: true,
            _orderId: orderId,
          }),
        });
      } catch (e) {
        console.warn("[M-PESA SIM] Callback failed:", e);
      }
    }, 3000);

    return { ok: true, checkoutRequestId: fakeId, simulated: true };
  }

  // ─── REAL DARAJA MODE ────────────────────────────────────────────
  const shortcode = process.env.DARAJA_SHORTCODE!;
  const passkey = process.env.DARAJA_PASSKEY!;
  const base = getBaseUrl();
  const timestamp = getTimestamp();
  const password = generatePassword(shortcode, passkey, timestamp);

  try {
    const token = await getAccessToken();
    const accountRef = `HC${orderId.slice(-6).toUpperCase()}`;

    const res = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amount),
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: callbackUrl,
        AccountReference: accountRef,
        TransactionDesc: `HustleCart order ${accountRef}`,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, checkoutRequestId: "", simulated: false, error: `Daraja STK push failed: ${res.status} ${text.slice(0, 200)}` };
    }

    const data = await res.json();
    if (data.ResponseCode !== "0") {
      return { ok: false, checkoutRequestId: "", simulated: false, error: data.ResponseDescription || "STK push failed" };
    }

    return {
      ok: true,
      checkoutRequestId: data.CheckoutRequestID,
      simulated: false,
    };
  } catch (e) {
    return {
      ok: false,
      checkoutRequestId: "",
      simulated: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}
