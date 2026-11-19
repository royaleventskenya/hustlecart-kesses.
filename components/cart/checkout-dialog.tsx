"use client";

// Checkout dialog — delivery details + delivery zone + time slot + place order.
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle2, Banknote, MapPin, Smartphone, MapPin as MapPinIcon } from "lucide-react";
import { toast } from "sonner";
import { useAppStore, selectCartSubtotal } from "@/store/use-app-store";
import { formatKES } from "@/lib/format";
import { MapPicker } from "@/components/map-components";

const DEFAULT_DELIVERY_FEE = 80; // fallback if zones haven't been set up

type Zone = { id: string; name: string; description: string | null; fee: number };

export function CheckoutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const cart = useAppStore((s) => s.cart);
  const subtotal = useAppStore(selectCartSubtotal);
  const session = useAppStore((s) => s.session);
  const clearCart = useAppStore((s) => s.clearCart);
  const setCartOpen = useAppStore((s) => s.setCartOpen);
  const setView = useAppStore((s) => s.setView);
  const setActiveOrderId = useAppStore((s) => s.setActiveOrderId);

  const [name, setName] = useState(session?.name ?? "");
  const [phone, setPhone] = useState(session?.phone ?? "");
  const [location, setLocation] = useState("");
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  // Scheduled delivery: null = deliver ASAP (today, as soon as possible).
  // Otherwise an ISO string for the chosen slot.
  const [scheduledFor, setScheduledFor] = useState<string>("");
  // Payment method: "cod" (cash on delivery) or "mpesa" (M-Pesa STK push).
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "mpesa">("cod");
  const [mpesaPhone, setMpesaPhone] = useState(session?.phone ?? "");
  // M-Pesa STK push state: null = not started, "pending" = waiting for confirmation,
  // "paid" = confirmed, "failed" = failed.
  const [mpesaStatus, setMpesaStatus] = useState<"idle" | "pending" | "paid" | "failed">("idle");
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  // Fetch delivery zones on mount (or when dialog opens).
  useEffect(() => {
    if (!open) return;
    fetch("/api/delivery-zones")
      .then((r) => r.json())
      .then((d) => {
        const zs = d.zones || [];
        setZones(zs);
        // Auto-select the cheapest zone by default.
        if (zs.length > 0 && !selectedZoneId) setSelectedZoneId(zs[0].id);
      })
      .catch(() => setZones([]));
  }, [open]);

  // Compute the delivery fee based on the selected zone.
  const selectedZone = zones.find((z) => z.id === selectedZoneId);
  const deliveryFee = selectedZone ? selectedZone.fee : zones.length === 0 ? DEFAULT_DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  function reset() {
    setName(session?.name ?? "");
    setPhone(session?.phone ?? "");
    setLocation("");
    setSelectedZoneId(zones[0]?.id || "");
    setScheduledFor("");
    setPaymentMethod("cod");
    setMpesaPhone(session?.phone ?? "");
    setMpesaStatus("idle");
    setDeliveryLat(null);
    setDeliveryLng(null);
    setSuccessOrderId(null);
  }

  function handleClose(o: boolean) {
    onOpenChange(o);
    if (!o) {
      // small delay so the close animation doesn't fight with reset
      setTimeout(reset, 200);
    }
  }

  async function placeOrder() {
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Enter the delivery name.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Enter your phone number.");
      return;
    }
    if (!location.trim() || location.trim().length < 5) {
      toast.error("Tell us where to deliver — at least a landmark.");
      return;
    }
    if (paymentMethod === "mpesa" && !mpesaPhone.trim()) {
      toast.error("Enter your M-Pesa phone number.");
      return;
    }
    setSubmitting(true);
    try {
      // Step 1: create the order (with paymentMethod + paymentStatus=UNPAID for M-Pesa).
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
          deliveryName: name,
          deliveryPhone: phone,
          deliveryLocation: location,
          paymentMethod: paymentMethod,
          scheduledFor: scheduledFor || undefined,
          zoneId: selectedZoneId || undefined,
          deliveryLat: deliveryLat,
          deliveryLng: deliveryLng,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not place order.");
        setSubmitting(false);
        return;
      }

      // Step 2: if M-Pesa, initiate the STK push.
      if (paymentMethod === "mpesa") {
        setMpesaStatus("pending");
        toast.info("Sending M-Pesa prompt…", {
          description: "Check your phone for the STK push.",
        });

        const stkRes = await fetch("/api/mpesa/stk-push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: data.orderId, phone: mpesaPhone }),
        });
        const stkData = await stkRes.json();
        if (!stkRes.ok) {
          setMpesaStatus("failed");
          toast.error(stkData.error || "M-Pesa push failed.");
          // Order is still placed (with paymentStatus=FAILED) — shopper can retry or pay COD.
          setSuccessOrderId(data.orderId);
          clearCart();
          setCartOpen(false);
          setSubmitting(false);
          return;
        }

        if (stkData.simulated) {
          // In dev mode, the payment auto-confirms after 3s.
          toast.info("Simulating M-Pesa payment…", {
            description: "Will auto-confirm in 3 seconds.",
          });
        } else {
          toast.success("M-Pesa prompt sent!", {
            description: "Enter your PIN on your phone to complete payment.",
          });
        }

        // Poll for payment status (check every 2s for up to 60s).
        const pollStart = Date.now();
        const pollInterval = setInterval(async () => {
          try {
            const checkRes = await fetch(`/api/orders/${data.orderId}`);
            const checkData = await checkRes.json();
            const status = checkData.order?.paymentStatus;
            if (status === "PAID") {
              clearInterval(pollInterval);
              setMpesaStatus("paid");
              setSuccessOrderId(data.orderId);
              clearCart();
              setCartOpen(false);
              toast.success("Payment confirmed!", {
                description: "Your order is placed and paid.",
              });
              setSubmitting(false);
            } else if (status === "FAILED" || Date.now() - pollStart > 60000) {
              clearInterval(pollInterval);
              setMpesaStatus("failed");
              setSuccessOrderId(data.orderId);
              clearCart();
              setCartOpen(false);
              if (status !== "FAILED") {
                toast.error("Payment timeout.", {
                  description: "Your order is placed but payment is still pending. We'll contact you.",
                });
              } else {
                toast.error("Payment failed.", {
                  description: "Your order is placed — pay cash on delivery instead.",
                });
              }
              setSubmitting(false);
            }
          } catch {
            // ignore poll errors
          }
        }, 2000);

        return; // Don't fall through to the COD success handler.
      }

      // Step 3: for COD, just show success.
      setSuccessOrderId(data.orderId);
      clearCart();
      setCartOpen(false);
      toast.success("Order placed!", {
        description: "Your HustleCart personal shopper is on it.",
      });
    } catch (e) {
      console.error(e);
      toast.error("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function viewTracking() {
    if (!successOrderId) return;
    setActiveOrderId(successOrderId);
    setView("tracking");
    onOpenChange(false);
    setTimeout(reset, 200);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-navy">
            {successOrderId ? "Order placed!" : "Checkout"}
          </DialogTitle>
          <DialogDescription>
            {successOrderId
              ? "Your order has been received by HustleCart."
              : "Confirm delivery details and payment."}
          </DialogDescription>
        </DialogHeader>

        {successOrderId ? (
          <div className="py-4 space-y-4 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/15 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-success" />
            </div>
            <div>
              <div className="font-semibold text-navy">Order received</div>
              <div className="text-sm text-muted-foreground mt-1">
                Order ID <span className="font-mono font-semibold text-navy">
                  {successOrderId.slice(-6).toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Your personal shopper will accept it shortly. You can track its status in real time.
              </div>
            </div>
            <Button
              className="w-full bg-orange-brand hover:bg-orange-brand/90"
              onClick={viewTracking}
            >
              Track my order
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="ck-name">Delivery name</Label>
              <Input
                id="ck-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Kamau"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ck-phone">Phone number</Label>
              <Input
                id="ck-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254 7XX XXX XXX"
                inputMode="tel"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ck-zone">Delivery area</Label>
              {zones.length === 0 ? (
                <div className="bg-muted/40 rounded-md p-2.5 text-xs text-muted-foreground flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 text-orange-brand shrink-0" />
                  <span>
                    Delivery zones haven&rsquo;t been set up yet. A flat fee of KSh {DEFAULT_DELIVERY_FEE} will apply.
                  </span>
                </div>
              ) : (
                <select
                  id="ck-zone"
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} — KSh {Math.round(z.fee).toLocaleString("en-KE")}
                    </option>
                  ))}
                </select>
              )}
              {selectedZone?.description && (
                <p className="text-xs text-muted-foreground">{selectedZone.description}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ck-loc">Delivery location</Label>
              <Textarea
                id="ck-loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Near Kesses Market, behind Equity Bank"
                rows={2}
              />
            </div>

            {/* Map picker — shopper drops a pin on their exact location */}
            <div className="grid gap-2">
              <Label>
                Pin your location on the map
                <span className="text-muted-foreground font-normal ml-1">
                  (tap the map or drag the pin)
                </span>
              </Label>
              <MapPicker
                lat={deliveryLat}
                lng={deliveryLng}
                onChange={(lat, lng) => {
                  setDeliveryLat(lat);
                  setDeliveryLng(lng);
                }}
              />
              {deliveryLat != null && deliveryLng != null ? (
                <p className="text-xs text-success flex items-center gap-1">
                  <MapPinIcon className="w-3 h-3" />
                  Location pinned: {deliveryLat.toFixed(5)}, {deliveryLng.toFixed(5)}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Tap on the map to drop a pin so we know exactly where to deliver.
                </p>
              )}
            </div>

            {/* Delivery time slot picker — null/ASAP or a specific slot. */}
            <DeliverySlotPicker value={scheduledFor} onChange={setScheduledFor} />

            {/* Payment method — Cash on delivery or M-Pesa STK push. */}
            <div className="grid gap-2">
              <Label>Payment method</Label>
              <div className="grid grid-cols-1 gap-2">
                {/* Cash on delivery */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                    paymentMethod === "cod" ? "border-orange-brand bg-orange-brand/5" : "border-border hover:border-orange-brand/30"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                    paymentMethod === "cod" ? "bg-orange-brand text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-navy">Cash on delivery</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Pay your HustleCart shopper in cash when your order arrives.
                    </div>
                  </div>
                </button>

                {/* M-Pesa STK push */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("mpesa")}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                    paymentMethod === "mpesa" ? "border-orange-brand bg-orange-brand/5" : "border-border hover:border-orange-brand/30"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                    paymentMethod === "mpesa" ? "bg-orange-brand text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-navy flex items-center gap-2">
                      M-Pesa
                      <span className="text-[10px] bg-success/15 text-success px-1.5 py-0.5 rounded-full font-semibold">
                        STK Push
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Pay now via M-Pesa. We&rsquo;ll send a payment prompt to your phone.
                    </div>
                  </div>
                </button>
              </div>

              {/* M-Pesa phone input (only when M-Pesa is selected) */}
              {paymentMethod === "mpesa" && (
                <div className="mt-2 grid gap-2">
                  <Label htmlFor="ck-mpesa-phone">M-Pesa phone number</Label>
                  <Input
                    id="ck-mpesa-phone"
                    inputMode="tel"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    placeholder="07XX XXX XXX (same as your M-Pesa)"
                  />
                  {mpesaStatus === "pending" && (
                    <div className="flex items-center gap-2 text-sm text-orange-brand bg-orange-brand/10 rounded-md p-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Waiting for M-Pesa confirmation…
                    </div>
                  )}
                  {mpesaStatus === "paid" && (
                    <div className="flex items-center gap-2 text-sm text-success bg-success/10 rounded-md p-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Payment confirmed! Your order is placed.
                    </div>
                  )}
                  {mpesaStatus === "failed" && (
                    <div className="text-sm text-destructive bg-destructive/10 rounded-md p-2">
                      Payment failed. Your order is placed — you can pay cash on delivery instead.
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="text-navy font-medium">{formatKES(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery fee {selectedZone && `(${selectedZone.name})`}</span>
                <span className="text-navy font-medium">{formatKES(deliveryFee)}</span>
              </div>
              <Separator className="my-1.5" />
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-navy">Total</span>
                <span className="text-lg font-extrabold text-orange-brand">{formatKES(total)}</span>
              </div>
            </div>
          </div>
        )}

        {!successOrderId && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={submitting}
            >
              Back
            </Button>
            <Button
              className="bg-orange-brand hover:bg-orange-brand/90"
              onClick={placeOrder}
              disabled={submitting || cart.length === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Placing order…
                </>
              ) : (
                <>Place order · {formatKES(total)}</>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// DeliverySlotPicker — lets the shopper pick a delivery time slot.
// Options: ASAP (today) + morning/afternoon/evening slots for today + tomorrow.
// Value is "" (ASAP) or an ISO string at the start of the chosen slot.
function DeliverySlotPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  // Build the slot options on the client based on the current time.
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  type Slot = { label: string; iso: string; group: string };
  const slots: Slot[] = [];

  // ASAP is always an option.
  slots.push({ label: "As soon as possible (today)", iso: "", group: "Today" });

  // Today's remaining slots — only future ones.
  const todaySlots = [
    { h: 9, label: "Morning (9am–12pm)" },
    { h: 12, label: "Afternoon (12pm–3pm)" },
    { h: 15, label: "Late afternoon (3pm–6pm)" },
    { h: 18, label: "Evening (6pm–8pm)" },
  ];
  for (const s of todaySlots) {
    const slotStart = new Date(today.getTime() + s.h * 60 * 60 * 1000);
    // Only show today's slot if it hasn't started yet (or is starting soon).
    if (slotStart.getTime() > now.getTime() - 60 * 60 * 1000) {
      slots.push({ label: s.label, iso: slotStart.toISOString(), group: "Today" });
    }
  }

  // Tomorrow's slots — all of them.
  const tomorrowSlots = [
    { h: 8, label: "Early morning (8am–11am)" },
    { h: 11, label: "Late morning (11am–1pm)" },
    { h: 13, label: "Afternoon (1pm–4pm)" },
    { h: 16, label: "Evening (4pm–7pm)" },
  ];
  for (const s of tomorrowSlots) {
    const slotStart = new Date(tomorrow.getTime() + s.h * 60 * 60 * 1000);
    slots.push({ label: s.label, iso: slotStart.toISOString(), group: "Tomorrow" });
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor="ck-slot">Delivery time</Label>
      <select
        id="ck-slot"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {slots.map((s, i) => (
          <option key={i} value={s.iso}>
            {s.group === "Today" && i > 0 ? "Today — " : s.group === "Tomorrow" ? "Tomorrow — " : ""}
            {s.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">
        {value ? "We'll aim to deliver in your chosen slot." : "We'll deliver as soon as we can — usually within the hour."}
      </p>
    </div>
  );
}
