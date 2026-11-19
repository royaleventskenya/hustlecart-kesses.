"use client";

// Order tracking (shopper view) — shows the timeline + WhatsApp buttons.
// Subscribes to the order-events WebSocket mini-service for live status updates:
// when the vendor advances the status, the tracking page refreshes automatically.
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  Phone,
  MessageCircle,
  Truck,
  Package,
  Store,
  Wallet,
  WifiOff,
  Radio,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/store/use-app-store";
import {
  formatKES,
  formatDateShort,
  humanizeStatus,
  shortOrderId,
  whatsappLink,
} from "@/lib/format";
import { StatusTimeline } from "./status-timeline";
import { MapView } from "@/components/map-components";

type TrackingOrder = {
  id: string;
  status: string;
  deliveryPhotoUrl: string | null;
  total: number;
  deliveryFee: number;
  paymentMethod: string;
  paymentStatus: string;
  mpesaReceiptNo: string | null;
  deliveryLocation: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
  customerName: string;
  customerPhone: string;
  createdAt: string;
  scheduledFor: string | null;
  operatorPhone?: string | null;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    productId: string;
    product: { shop: { id: string; name: string; phone: string } };
  }[];
  statusEvents: { id: string; status: string; note: string | null; createdAt: string }[];
};

export function OrderTracking() {
  const orderId = useAppStore((s) => s.activeOrderId);
  const setView = useAppStore((s) => s.setView);
  const setActiveOrderId = useAppStore((s) => s.setActiveOrderId);
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // WebSocket connection state for the live indicator.
  const [live, setLive] = useState(false);
  // Track the last status we saw, so we can toast only on actual changes.
  const lastStatusRef = useRef<string | null>(null);

  // Fetch the order from the API. Called on mount and whenever the socket
  // emits an `order:status` event for this order.
  const loadOrder = useCallback(
    async (id: string, opts?: { silent?: boolean }) => {
      try {
        const r = await fetch(`/api/orders/${id}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load order");
        const prev = lastStatusRef.current;
        const next: string = d.order.status;
        // Merge operatorPhone into the order object so the WhatsApp button
        // can use it after the fetch.
        setOrder({ ...d.order, operatorPhone: d.operatorPhone ?? null });
        lastStatusRef.current = next;
        // If status actually changed since we last saw it (and this isn't the
        // initial load), surface a toast.
        if (!opts?.silent && prev && prev !== next) {
          toast.success(`Order ${humanizeStatus(next)}`, {
            description: "HustleCart just updated your order.",
          });
        }
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load order");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial fetch when orderId changes.
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    lastStatusRef.current = null;
    (async () => {
      setLoading(true);
      setError(null);
      if (!cancelled) await loadOrder(orderId, { silent: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, loadOrder]);

  // WebSocket subscription: connect once, join the order's room, listen for
  // status events, and re-fetch on every event.
  useEffect(() => {
    if (!orderId) return;
    // Connect to the order-events mini-service via Caddy. Path MUST be "/"
    // and the port MUST be passed via the XTransformPort query (per the
    // fullstack-dev skill rules).
    const socket: Socket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
      timeout: 8000,
    });

    socket.on("connect", () => {
      setLive(true);
      socket.emit("subscribe:order", { orderId });
    });
    socket.on("disconnect", () => setLive(false));
    socket.on("connect_error", () => setLive(false));

    socket.on("order:status", (payload: { orderId: string; status: string; note?: string | null }) => {
      if (payload?.orderId !== orderId) return;
      // Re-fetch silently — loadOrder will toast because lastStatusRef differs.
      loadOrder(orderId);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      setLive(false);
    };
  }, [orderId, loadOrder]);

  if (!orderId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h3 className="font-semibold text-navy">No order selected</h3>
        <Button className="mt-3 bg-orange-brand hover:bg-orange-brand/90" onClick={() => setView("orders")}>
          View my orders
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h3 className="font-semibold text-navy">{error || "Order not found"}</h3>
        <Button className="mt-3 bg-orange-brand hover:bg-orange-brand/90" onClick={() => setView("orders")}>
          Back to orders
        </Button>
      </div>
    );
  }

  // The operator's contact phone — for the shopper's "Chat with HustleCart"
  // WhatsApp button. Included in the order API response.
  const operatorPhone = order.operatorPhone || null;
  const isDone = order.status === "DELIVERED" || order.status === "CANCELLED";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <button
        onClick={() => {
          setActiveOrderId(null);
          setView("orders");
        }}
        className="text-sm text-muted-foreground hover:text-navy flex items-center gap-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to my orders
      </button>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-4"
      >
        {/* Order header */}
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                Order
                {/* Live indicator — only shown while the order is still active */}
                {!isDone && (
                  <Badge
                    className={`ml-1 px-1.5 py-0 h-5 gap-1 text-[10px] font-medium border-0 ${
                      live
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                    title={
                      live
                        ? "Connected — you'll see status changes instantly"
                        : "Reconnecting…"
                    }
                  >
                    {live ? (
                      <>
                        <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-2.5 h-2.5" /> OFFLINE
                      </>
                    )}
                  </Badge>
                )}
              </div>
              <div className="font-mono font-bold text-xl text-navy">
                #{shortOrderId(order.id)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Placed {formatDateShort(order.createdAt)}
              </div>
              {order.scheduledFor && (
                <div className="mt-2 inline-flex items-center gap-1.5 bg-orange-brand/10 border border-orange-brand/30 rounded-md px-2 py-1 text-xs font-medium text-orange-brand">
                  <Clock className="w-3 h-3" />
                  Scheduled for {new Date(order.scheduledFor).toLocaleString("en-KE", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Total</div>
              <div className="text-xl font-extrabold text-orange-brand">{formatKES(order.total)}</div>
              <div className="text-xs text-muted-foreground">
                incl. {formatKES(order.deliveryFee)} delivery
              </div>
            </div>
          </div>
        </Card>

        {/* Tracking timeline */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-5 h-5 text-orange-brand" />
            <h3 className="font-bold text-navy">Tracking</h3>
          </div>
          <StatusTimeline events={order.statusEvents} current={order.status} />
        </Card>

        {/* Delivery + customer info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Delivery to
            </div>
            <div className="flex items-start gap-1.5 text-sm text-navy">
              <MapPin className="w-4 h-4 mt-0.5 text-orange-brand shrink-0" />
              {order.deliveryLocation}
            </div>
            {order.deliveryLat != null && order.deliveryLng != null && (
              <div className="mt-3">
                <MapView lat={order.deliveryLat} lng={order.deliveryLng} height={180} />
              </div>
            )}
            <Separator className="my-2" />
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> {order.customerPhone}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Payment
            </div>
            <div className="flex items-center gap-1.5 text-sm text-navy">
              <Wallet className="w-4 h-4 text-orange-brand" />
              {order.paymentMethod === "mpesa" ? "M-Pesa" : "Cash on delivery"}
            </div>
            {order.paymentMethod === "mpesa" && (
              <div className="mt-1">
                {order.paymentStatus === "PAID" ? (
                  <Badge className="bg-success text-white">Paid{order.mpesaReceiptNo ? ` · ${order.mpesaReceiptNo}` : ""}</Badge>
                ) : order.paymentStatus === "PENDING" ? (
                  <Badge className="bg-amber-brand text-white">Payment pending</Badge>
                ) : order.paymentStatus === "FAILED" ? (
                  <Badge className="bg-destructive text-white">Payment failed — pay cash on delivery</Badge>
                ) : (
                  <Badge variant="secondary">Not paid</Badge>
                )}
              </div>
            )}
            <Separator className="my-2" />
            <div className="text-xs text-muted-foreground">
              {order.paymentMethod === "mpesa" && order.paymentStatus === "PAID"
                ? "Paid via M-Pesa — thank you!"
                : order.status === "DELIVERED"
                ? "Paid — thank you!"
                : order.status === "CANCELLED"
                ? "Cancelled."
                : "Pay your HustleCart shopper in cash on arrival."}
            </div>
          </Card>
        </div>

        {/* Items */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-orange-brand" />
            <h3 className="font-bold text-navy">Items</h3>
          </div>
          <div className="divide-y divide-border">
            {order.items.map((it) => (
              <div key={it.id} className="flex items-start justify-between py-2.5">
                <div className="flex-1">
                  <div className="text-sm font-medium text-navy">{it.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Store className="w-3 h-3" /> {it.product.shop.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-navy">
                    {formatKES(it.price * it.quantity)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {it.quantity} × {formatKES(it.price)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Delivery photo proof */}
        {order.deliveryPhotoUrl && (
          <Card className="p-4">
            <h3 className="font-bold text-navy mb-2 flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-brand" />
              Delivery photo
            </h3>
            <div className="rounded-lg overflow-hidden border border-border">
              <img src={order.deliveryPhotoUrl} alt="Delivery proof" className="w-full" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Photo taken by your HustleCart shopper as proof of delivery.
            </p>
          </Card>
        )}

        {/* WhatsApp actions */}
        <Card className="p-4 space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Need help?
          </div>
          {operatorPhone && (
            <a
              href={whatsappLink(
                operatorPhone,
                `Hello HustleCart, about my order #${shortOrderId(order.id)} — `
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full text-success border-success/40 hover:bg-success/10">
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat with HustleCart on WhatsApp
              </Button>
            </a>
          )}
          {isDone && (
            <div className="text-center text-sm text-muted-foreground py-2">
              {order.status === "DELIVERED"
                ? "Delivered — thanks for shopping with HustleCart Kesses!"
                : "This order was cancelled."}
            </div>
          )}
        </Card>

        {/* Cancel button — only shows when status is PLACED (before operator accepts) */}
        {order.status === "PLACED" && (
          <CancelOrderButton orderId={order.id} onCancelled={() => {
            // Reload the order to show the cancelled state.
            loadOrder(order.id, { silent: true });
          }} />
        )}

        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => setView("shop")}>
            Continue shopping
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// CancelOrderButton — lets the shopper cancel an order before the operator
// accepts it. Shows a confirmation dialog first.
function CancelOrderButton({ orderId, onCancelled }: { orderId: string; onCancelled: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function doCancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not cancel.");
        return;
      }
      toast.success("Order cancelled", {
        description: "Your order has been cancelled. Stock has been restored.",
      });
      onCancelled();
    } catch {
      toast.error("Network error.");
    } finally {
      setCancelling(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <Card className="p-4 border-destructive/30">
        <p className="text-sm text-navy mb-3">
          Are you sure you want to cancel this order? This can&rsquo;t be undone.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={cancelling}>
            No, keep it
          </Button>
          <Button size="sm" variant="destructive" onClick={doCancel} disabled={cancelling}>
            {cancelling ? "Cancelling…" : "Yes, cancel order"}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex justify-center">
      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirming(true)}>
        Cancel this order
      </Button>
    </div>
  );
}
