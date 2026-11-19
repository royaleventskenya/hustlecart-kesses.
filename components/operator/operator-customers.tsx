"use client";

// OperatorCustomers — your customer database.
// Table of all shoppers who have placed at least one order, with order count,
// total spent (delivered orders), completed orders, last order date.
// Click a customer → detail dialog with full order history.
// Also includes a "Chat on WhatsApp" button per customer.
import { useEffect, useState } from "react";
import { ChevronRight, MessageCircle, Phone, Users, Wallet, ShoppingBag, Clock } from "lucide-react";
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
  formatPhone,
} from "@/lib/format";

type Customer = {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  orderCount: number;
  completedOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
};

type CustomerDetail = {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  orders: {
    id: string;
    status: string;
    total: number;
    deliveryFee: number;
    deliveryLocation: string;
    paymentMethod: string;
    createdAt: string;
    scheduledFor: string | null;
    items: { id: string; name: string; price: number; quantity: number }[];
  }[];
};

export function OperatorCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/operator/customers");
      const d = await r.json();
      setCustomers(d.customers || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!openId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/operator/customers/${openId}`);
        const d = await r.json();
        if (!cancelled) setDetail(d.customer);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openId]);

  if (loading) {
    return (
      <Card className="p-4 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </Card>
    );
  }

  if (customers.length === 0) {
    return (
      <Card className="py-12 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
          <Users className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-navy">No customers yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          When shoppers place their first order, they&rsquo;ll appear here. Your best customers
          show up at the top.
        </p>
      </Card>
    );
  }

  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);
  const totalOrders = customers.reduce((s, c) => s + c.orderCount, 0);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-bold text-navy text-lg">Customers</h2>
            <p className="text-sm text-muted-foreground">
              {customers.length} customer{customers.length !== 1 ? "s" : ""} ·{" "}
              {totalOrders} order{totalOrders !== 1 ? "s" : ""} ·{" "}
              {formatKES(totalRevenue)} delivered
            </p>
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Total spent</TableHead>
                  <TableHead>Last order</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-navy">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-orange-brand text-white text-xs font-bold flex items-center justify-center">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        {c.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatPhone(c.phone)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{c.orderCount}</TableCell>
                    <TableCell className="text-right">{c.completedOrders}</TableCell>
                    <TableCell className="text-right font-semibold text-success">
                      {formatKES(c.totalSpent)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.lastOrderAt ? formatDateShort(c.lastOrderAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setOpenId(c.id)}
                        aria-label="View customer"
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
      </div>

      {/* Detail dialog */}
      <Dialog open={openId !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="text-navy">
              {detail ? detail.name : "Customer"}
            </DialogTitle>
            <DialogDescription>
              {detail ? `Customer since ${formatDateShort(detail.createdAt)}` : ""}
            </DialogDescription>
          </DialogHeader>

          {detailLoading && (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          )}

          {!detailLoading && detail && (
            <div className="space-y-4">
              {/* Contact + WhatsApp */}
              <div className="bg-muted/40 rounded-lg p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-brand text-white font-bold flex items-center justify-center shrink-0">
                  {detail.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-navy">{detail.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {formatPhone(detail.phone)}
                  </div>
                </div>
                <a
                  href={whatsappLink(detail.phone, `Hello ${detail.name}, this is HustleCart Kesses — `)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" variant="outline" className="text-success border-success/40 hover:bg-success/10">
                    <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                    Chat
                  </Button>
                </a>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <Stat icon={<ShoppingBag className="w-4 h-4" />} label="Orders" value={String(detail.orders.length)} />
                <Stat icon={<Wallet className="w-4 h-4" />} label="Spent" value={formatKES(detail.orders.filter((o) => o.status === "DELIVERED").reduce((s, o) => s + o.total, 0))} />
                <Stat icon={<Clock className="w-4 h-4" />} label="Last" value={detail.orders[0] ? formatDateShort(detail.orders[0].createdAt) : "—"} />
              </div>

              <Separator />

              {/* Order history */}
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Order history
                </div>
                {detail.orders.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    No orders yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detail.orders.map((o) => {
                      const statusMap: Record<string, string> = {
                        PLACED: "bg-navy text-white",
                        ACCEPTED: "bg-orange-brand text-white",
                        SHOPPING: "bg-amber-brand text-white",
                        OUT_FOR_DELIVERY: "bg-orange-brand text-white",
                        DELIVERED: "bg-success text-white",
                        CANCELLED: "bg-destructive text-white",
                      };
                      return (
                        <div key={o.id} className="border border-border rounded-lg p-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-navy">#{shortOrderId(o.id)}</span>
                              <Badge className={statusMap[o.status] || "bg-muted"}>
                                {humanizeStatus(o.status)}
                              </Badge>
                              {o.scheduledFor && (
                                <Badge variant="outline" className="text-xs">
                                  {new Date(o.scheduledFor).toLocaleString("en-KE", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                                </Badge>
                              )}
                            </div>
                            <span className="font-semibold text-navy">{formatKES(o.total)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDateShort(o.createdAt)} · {o.items.reduce((s, i) => s + i.quantity, 0)} item(s)
                          </div>
                          <div className="text-xs text-foreground mt-1">
                            {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-lg p-3 text-center">
      <div className="text-orange-brand mx-auto mb-1 flex justify-center">{icon}</div>
      <div className="text-sm font-bold text-navy">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}
