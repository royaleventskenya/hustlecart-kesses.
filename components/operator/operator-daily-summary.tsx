"use client";

// OperatorDailySummary — today's business report.
// Shows: order count, revenue, profit, top items, all today's orders.
// Includes a "Share via WhatsApp" button + a "Print" button.
import { useEffect, useState } from "react";
import {
  TrendingUp,
  Wallet,
  ClipboardList,
  CheckCircle2,
  Package,
  RefreshCw,
  Printer,
  MessageCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatKES, formatDateShort, humanizeStatus, shortOrderId, whatsappLink } from "@/lib/format";

type Summary = {
  date: string;
  orderCount: number;
  deliveredCount: number;
  pendingCount: number;
  cancelledCount: number;
  requestCount: number;
  revenue: number;
  profit: number;
  topItems: { name: string; quantity: number; revenue: number }[];
  orders: {
    id: string;
    shortId: string;
    status: string;
    total: number;
    customerName: string;
    deliveryZoneName: string | null;
    itemCount: number;
  }[];
  textSummary: string;
};

export function OperatorDailySummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/operator/daily-summary");
      const d = await r.json();
      setSummary(d);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!summary || summary.orderCount === 0) {
    return (
      <Card className="py-12 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
          <TrendingUp className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-navy">No orders today yet</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          When orders come in, your daily summary will appear here — revenue, profit,
          top items, and a shareable report.
        </p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
        </Button>
      </Card>
    );
  }

  // Get the operator's phone for the WhatsApp share (from the session).
  // The text summary is already built server-side — we just need a phone to
  // send it to. The operator can share it to their own WhatsApp (saved messages)
  // or to a group. We use their own phone as the default target.
  const shareUrl = whatsappLink(
    "", // empty phone — operator edits in WhatsApp to pick a chat
    summary.textSummary
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-bold text-navy text-lg">Daily summary</h2>
          <p className="text-sm text-muted-foreground">
            {formatDateShort(summary.date)} · {summary.orderCount} order{summary.orderCount !== 1 ? "s" : ""} today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1.5" /> Print
          </Button>
          <a href={shareUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="bg-success hover:bg-success/90 text-white">
              <MessageCircle className="w-4 h-4 mr-1.5" /> Share on WhatsApp
            </Button>
          </a>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Orders today"
          value={String(summary.orderCount)}
          sub={`${summary.deliveredCount} delivered, ${summary.pendingCount} pending`}
          icon={<ClipboardList className="w-5 h-5" />}
          tone="navy"
        />
        <StatCard
          label="Quick orders"
          value={String(summary.requestCount)}
          sub="free-text requests"
          icon={<Package className="w-5 h-5" />}
          tone="amber"
        />
        <StatCard
          label="Revenue"
          value={formatKES(summary.revenue)}
          sub="all non-cancelled"
          icon={<TrendingUp className="w-5 h-5" />}
          tone="orange"
        />
        <StatCard
          label="Profit"
          value={formatKES(summary.profit)}
          sub="markup + delivery fees"
          icon={<Wallet className="w-5 h-5" />}
          tone="success"
        />
      </div>

      {/* Top items */}
      {summary.topItems.length > 0 && (
        <Card className="p-4">
          <h3 className="font-bold text-navy mb-3">Top items today</h3>
          <div className="space-y-2">
            {summary.topItems.map((it, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono w-5">#{i + 1}</span>
                  <span className="font-medium text-navy">{it.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{it.quantity}×</Badge>
                  <span className="font-semibold text-navy">{formatKES(it.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* All today's orders */}
      <Card className="p-4">
        <h3 className="font-bold text-navy mb-3">Today&rsquo;s orders</h3>
        <div className="space-y-2">
          {summary.orders.map((o) => {
            const statusMap: Record<string, string> = {
              PLACED: "bg-navy text-white",
              ACCEPTED: "bg-orange-brand text-white",
              SHOPPING: "bg-amber-brand text-white",
              OUT_FOR_DELIVERY: "bg-orange-brand text-white",
              DELIVERED: "bg-success text-white",
              CANCELLED: "bg-destructive text-white",
            };
            return (
              <div
                key={o.id}
                className="flex items-center justify-between border border-border rounded-lg p-2.5 text-sm"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-navy">#{o.shortId}</span>
                  <Badge className={statusMap[o.status] || "bg-muted"}>
                    {humanizeStatus(o.status)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {o.customerName} · {o.itemCount} item(o.itemCount !== 1 ? "s" : "")
                    {o.deliveryZoneName && ` · ${o.deliveryZoneName}`}
                  </span>
                </div>
                <span className="font-semibold text-navy">{formatKES(o.total)}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Text summary preview (for reference) */}
      <Card className="p-4 bg-muted/30">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
          WhatsApp summary preview
        </div>
        <pre className="text-xs text-navy whitespace-pre-wrap font-mono">{summary.textSummary}</pre>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  tone: "orange" | "navy" | "amber" | "success";
}) {
  const toneClass = {
    orange: "bg-orange-brand/15 text-orange-brand",
    navy: "bg-navy/10 text-navy",
    amber: "bg-amber-brand/15 text-amber-brand",
    success: "bg-success/15 text-success",
  }[tone];
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</div>
          <div className="text-2xl font-extrabold text-navy mt-1">{value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${toneClass}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
