// OTP store — in-memory map of phone -> { code, name, role, expiresAt }.
// Lives for 5 minutes. Used by /api/auth/send-code and /api/auth/verify.
//
// We attach the Map to `globalThis` so it survives Next.js dev-server HMR
// (Hot Module Replacement) — without this, every file edit would reset the
// store and any in-flight OTPs would be lost. In production this is just a
// normal module-level Map.
//
// In a multi-instance production deployment you'd swap this for Redis or a DB
// table, but for a single-instance Next.js server this is fine.

type StoredOtp = {
  code: string;
  name: string; // the user-provided full name (carried through to user creation)
  role: "shopper" | "operator";
  expiresAt: number;
};

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MS = 30_000;

type StoreShape = {
  otps: Map<string, StoredOtp>;
  lastSentAt: Map<string, number>;
  purgeTimer: NodeJS.Timeout | null;
};

// Persist on globalThis so the store survives HMR in dev.
const g = globalThis as unknown as { __hustlecartOtpStore?: StoreShape };
if (!g.__hustlecartOtpStore) {
  g.__hustlecartOtpStore = {
    otps: new Map<string, StoredOtp>(),
    lastSentAt: new Map<string, number>(),
    purgeTimer: null,
  };
}
const store = g.__hustlecartOtpStore;

// Periodically purge expired entries (every 60s) so the map doesn't grow.
function ensurePurgeTimer() {
  if (store.purgeTimer) return;
  store.purgeTimer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store.otps) {
      if (v.expiresAt <= now) store.otps.delete(k);
    }
    for (const [k, t] of store.lastSentAt) {
      if (now - t > RATE_LIMIT_MS * 4) store.lastSentAt.delete(k);
    }
  }, 60_000);
  if (store.purgeTimer && typeof store.purgeTimer.unref === "function") {
    store.purgeTimer.unref();
  }
}

export function saveOtp(phone: string, code: string, name: string, role: "shopper" | "operator"): void {
  ensurePurgeTimer();
  store.otps.set(phone, { code, name, role, expiresAt: Date.now() + TTL_MS });
}

/** Consume the OTP for this phone (one-shot). Returns the stored record on success, null otherwise. */
export function consumeOtp(phone: string, code: string): StoredOtp | null {
  const entry = store.otps.get(phone);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.otps.delete(phone);
    return null;
  }
  if (entry.code !== code) return null;
  // One-shot use: delete after a successful verify.
  store.otps.delete(phone);
  return entry;
}

/** Whether a code is currently stored (and not expired) for this phone. */
export function hasOtp(phone: string): boolean {
  const entry = store.otps.get(phone);
  if (!entry) return false;
  if (entry.expiresAt <= Date.now()) {
    store.otps.delete(phone);
    return false;
  }
  return true;
}

/** Rate-limit helper: returns true if a send is allowed, false if too soon. */
export function checkRateLimit(phone: string): { allowed: boolean; waitSec?: number } {
  const now = Date.now();
  const last = store.lastSentAt.get(phone) ?? 0;
  if (now - last < RATE_LIMIT_MS) {
    return { allowed: false, waitSec: Math.ceil((RATE_LIMIT_MS - (now - last)) / 1000) };
  }
  store.lastSentAt.set(phone, now);
  return { allowed: true };
}
