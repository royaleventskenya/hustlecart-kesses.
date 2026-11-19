// Helper to emit an order-status event to the WebSocket mini-service.
// Called from /api/orders/[id]/status after a successful DB update so any
// shopper (or vendor) currently viewing that order sees the change live.
//
// Uses the internal HTTP endpoint POST /_emit on port 3004 (the order-events
// mini-service serves socket.io on 3003 and the internal emit endpoint on
// 3004 — they share the same `io` instance, so emitting via HTTP reaches the
// same socket.io rooms that browser clients are subscribed to). Authenticated
// with the HUSTLECART_INTERNAL_TOKEN env var.

const INTERNAL_TOKEN = process.env.HUSTLECART_INTERNAL_TOKEN || "dev-only-shared-secret";
const EMIT_URL = "http://localhost:3004/_emit";

export type OrderStatusEvent = {
  orderId: string;
  status: string;
  note: string | null;
  updatedAt: string;
};

export async function emitOrderStatus(ev: OrderStatusEvent): Promise<void> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2000); // 2s timeout
    await fetch(EMIT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hustlecart-Token": INTERNAL_TOKEN,
      },
      body: JSON.stringify({
        orderId: ev.orderId,
        event: "order:status",
        payload: {
          status: ev.status,
          note: ev.note,
          updatedAt: ev.updatedAt,
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(t);
  } catch (e) {
    // Non-fatal: live updates are a nice-to-have. The DB is already updated.
    console.warn("[emitOrderStatus] failed (non-fatal):", e instanceof Error ? e.message : e);
  }
}

// Broadcast a new-order or new-request event to the operator's browser so they
// get a sound + browser notification + toast. Targets the "operator" room
// (the operator dashboard subscribes to it on mount).
export async function emitToOperator(
  event: "order:new" | "request:new",
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2000);
    await fetch(EMIT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hustlecart-Token": INTERNAL_TOKEN,
      },
      body: JSON.stringify({
        room: "operator",
        event,
        payload,
      }),
      signal: controller.signal,
    });
    clearTimeout(t);
  } catch (e) {
    console.warn("[emitToOperator] failed (non-fatal):", e instanceof Error ? e.message : e);
  }
}
