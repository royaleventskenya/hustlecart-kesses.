"use client";

// OperatorOrders — table of all orders + detail dialog with status stepper.
// New status flow: PLACED -> ACCEPTED -> SHOPPING -> OUT_FOR_DELIVERY -> DELIVERED.
// Also shows profit per order.
import { useEffect, useState, useRef } from "react";
import { ChevronRight, MessageCircle, MapPin, Phone, Package, Truck, Wallet, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  formatKES,
  formatDateShort,
  humanizeStatus,
  shortOrderId,
  whatsappLink,
} from "@/lib/format";
import { StatusTimeline } from "../orders/status-timeline";
import { MapView, OpenInGoogleMapsButton } from "@/components/map-components";

type OperatorOrder = {
  id: string;
  status: string;
  deliveryPhotoUrl: string | null;
  total: number;
  deliveryFee: number;
  customerName: string;
  customerPhone: string;
  deliveryLocation: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
  paymentMethod: string;
  paymentStatus: string;
  mpesaReceiptNo: string | null;
  createdAt: string;
  scheduledFor: string | null;
  profit: number;
  items: { id: string; name: string; price: number; costPrice: number | null; quantity: number }[];
  statusEvents: { id: string; status: string; note: string | null; createdAt: string }[];
};

const STATUS_STEPS = ["PLACED", "ACCEPTED", "SHOPPING", "OUT_FOR_DELIVERY", "DELIVERED"];

export function OperatorOrders() {
  const [orders, setOrders] = useState<OperatorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/operator/orders");
      const d = await r.json();
      setOrders(d.orders || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const openOrder = orders.find((o) => o.id === openId) || null;

  async function advanceStatus(next: string) {
    if (!openOrder) return;
    setAdvancing(true);
    try {
      const res = await fetch(`/api/orders/${openOrder.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error || "Could not update status.");
        return;
      }
      toast.success(`Marked as ${humanizeStatus(next)}`);
      await load();
    } finally {
      setAdvancing(false);
    }
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      PLACED: "bg-navy text-white",
      ACCEPTED: "bg-orange-brand text-white",
      SHOPPING: "bg-amber-brand text-white",
      OUT_FOR_DELIVERY: "bg-orange-brand text-white",
      DELIVERED: "bg-success text-white",
      CANCELLED: "bg-destructive text-white",
    };
    return <Badge className={map[status] || "bg-muted"}>{humanizeStatus(status)}</Badge>;
  }

  function paymentBadge(method: string, payStatus: string) {
    if (method === "mpesa") {
      if (payStatus === "PAID") return <Badge className="bg-success text-white text-[10px]">M-Pesa PAID</Badge>;
      if (payStatus === "PENDING") return <Badge className="bg-amber-brand text-white text-[10px]">M-Pesa pending</Badge>;
      if (payStatus === "FAILED") return <Badge className="bg-destructive text-white text-[10px]">M-Pesa failed</Badge>;
      return <Badge className="bg-muted text-[10px]">M-Pesa</Badge>;
    }
    return <Badge variant="secondary" className="text-[10px]">COD</Badge>;
  }

  if (loading) {
    return (
      <Card className="p-4 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="py-12 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
          <Package className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-navy">No orders yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          When customers place orders, they&rsquo;ll appear here. Accept them, shop, and deliver.
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Placed</TableHead>
                <TableHead className="text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono font-semibold text-navy">
                    #{shortOrderId(o.id)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-navy">{o.customerName}</div>
                    <div className="text-xs text-muted-foreground">{o.customerPhone}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    {o.items.reduce((s, it) => s + it.quantity, 0)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-navy">
                    {formatKES(o.total)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-success">
                    {formatKES(o.profit)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {statusBadge(o.status)}
                      {paymentBadge(o.paymentMethod, o.paymentStatus)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateShort(o.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setOpenId(o.id)}
                      aria-label="View order"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Detail dialog */}
      <Dialog open={openId !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="text-navy">
              Order #{openOrder ? shortOrderId(openOrder.id) : ""}
            </DialogTitle>
            <DialogDescription>
              {openOrder ? formatDateShort(openOrder.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>

          {openOrder && (
            <div className="space-y-4">
              {/* Status stepper */}
              <div className="bg-muted/40 rounded-lg p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Status
                </div>
                <StatusTimeline events={openOrder.statusEvents} current={openOrder.status} compact />

                {openOrder.status !== "DELIVERED" && openOrder.status !== "CANCELLED" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {nextSteps(openOrder.status).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        className="bg-orange-brand hover:bg-orange-brand/90"
                        disabled={advancing}
                        onClick={() => advanceStatus(s)}
                      >
                        Mark as {humanizeStatus(s)}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/40 hover:bg-destructive/10"
                      disabled={advancing}
                      onClick={() => advanceStatus("CANCELLED")}
                    >
                      Cancel order
                    </Button>
                  </div>
                )}
              </div>

              {/* Customer + delivery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/40 rounded-lg p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Customer
                  </div>
                  <div className="font-semibold text-navy">{openOrder.customerName}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Phone className="w-3 h-3" /> {openOrder.customerPhone}
                  </div>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Delivery
                  </div>
                  <div className="flex items-start gap-1 text-xs text-navy">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 text-orange-brand shrink-0" />
                    {openOrder.deliveryLocation}
                  </div>
                  {openOrder.scheduledFor && (
                    <div className="text-xs text-orange-brand font-medium mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Scheduled: {new Date(openOrder.scheduledFor).toLocaleString("en-KE", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    {openOrder.paymentMethod === "mpesa"
                      ? `M-Pesa${openOrder.paymentStatus === "PAID" ? ` — PAID (${openOrder.mpesaReceiptNo})` : openOrder.paymentStatus === "PENDING" ? " — pending" : ""}`
                      : "Cash on delivery"}
                  </div>
                </div>
              </div>

              {/* Map showing the shopper's pinned location */}
              {openOrder.deliveryLat != null && openOrder.deliveryLng != null && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Delivery location (map)
                  </div>
                  <MapView lat={openOrder.deliveryLat} lng={openOrder.deliveryLng} height={220} />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {openOrder.deliveryLat.toFixed(5)}, {openOrder.deliveryLng.toFixed(5)}
                    </span>
                    <OpenInGoogleMapsButton lat={openOrder.deliveryLat} lng={openOrder.deliveryLng} />
                  </div>
                </div>
              )}

              {/* Items + profit */}
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Items to shop for
                </div>
                <div className="border border-border rounded-lg divide-y divide-border">
                  {openOrder.items.map((it) => {
                    const cp = it.costPrice ?? 0;
                    const markup = it.price - cp;
                    return (
                      <div key={it.id} className="flex items-center justify-between p-2.5 text-sm">
                        <div>
                          <div className="font-medium text-navy">{it.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {it.quantity} × sell {formatKES(it.price)}
                            {it.costPrice != null && (
                              <> · cost {formatKES(it.costPrice)} · markup {formatKES(markup)}</>
                            )}
                          </div>
                        </div>
                        <div className="font-semibold text-navy">
                          {formatKES(it.price * it.quantity)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order total (customer pays)</span>
                  <span className="font-semibold text-navy">{formatKES(openOrder.total)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Your profit (markup + delivery fee)</span>
                  <span className="font-bold text-success">{formatKES(openOrder.profit)}</span>
                </div>
              </div>

              {/* Delivery photo upload (when DELIVERED) */}
              {openOrder.status === "DELIVERED" && (
                <DeliveryPhotoSection
                  orderId={openOrder.id}
                  currentPhoto={openOrder.deliveryPhotoUrl}
                  onUploaded={() => load()}
                />
              )}

              {/* WhatsApp */}
              <a
                href={whatsappLink(
                  openOrder.customerPhone,
                  `Hello ${openOrder.customerName}, about your HustleCart Kesses order #${shortOrderId(openOrder.id)} — `
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="w-full text-success border-success/40 hover:bg-success/10">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat with customer on WhatsApp
                </Button>
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function nextSteps(current: string): string[] {
  const idx = STATUS_STEPS.indexOf(current);
  if (idx === -1 || idx === STATUS_STEPS.length - 1) return [];
  return [STATUS_STEPS[idx + 1]];
}

// DeliveryPhotoSection — lets the operator upload a photo as proof of delivery.
function DeliveryPhotoSection({
  orderId,
  currentPhoto,
  onUploaded,
}: {
  orderId: string;
  currentPhoto: string | null;
  onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max 5MB.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/orders/${orderId}/delivery-photo`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Upload failed.");
        return;
      }
      toast.success("Delivery photo uploaded");
      onUploaded();
    } catch {
      toast.error("Network error.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="bg-muted/40 rounded-lg p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
        Delivery photo proof
      </div>
      {currentPhoto ? (
        <div className="relative">
          <img src={currentPhoto} alt="Delivery proof" className="w-full rounded-lg border border-border" />
          <Button
            size="sm"
            variant="outline"
            className="absolute top-2 right-2 bg-navy/80 text-white border-0"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "Replace"}
          </Button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full py-6 rounded-lg border-2 border-dashed border-border hover:border-orange-brand/50 hover:bg-orange-brand/5 transition-colors text-sm text-muted-foreground"
        >
          {uploading ? "Uploading…" : "📷 Click to upload delivery photo"}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
