"use client";

// OperatorOverview — stats cards (revenue, profit, pending orders, delivered)
// + 7-day orders bar chart + pending orders queue with quick-status buttons.
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  Wallet,
  Clock,
  CheckCircle2,
  ChevronRight,
  Store,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatKES, formatDateShort, humanizeStatus, shortOrderId } from "@/lib/format";

type Stats = {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  revenue: number;
  profit: number;
};
type ChartDay = { label: string; key: string; count: number };
type Order = {
  id: string;
  status: string;
  total: number;
  customerName: string;
  customerPhone: string;
  deliveryLocation: string;
  createdAt: string;
  profit: number;
  items: { id: string; name: string; quantity: number }[];
};

export function OperatorOverview({ onGoToOrders }: { onGoToOrders: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chart, setChart] = useState<ChartDay[]>([]);
  const [pending, setPending] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/operator/earnings").then((r) => r.json()),
      fetch("/api/operator/orders").then((r) => r.json()),
    ])
      .then(([e, o]) => {
        setStats(e.stats);
        setChart(e.chart || []);
        const pendingOrders = (o.orders || []).filter(
          (x: Order) => x.status !== "DELIVERED" && x.status !== "CANCELLED"
        );
        setPending(pendingOrders);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Operator banner */}
      <Card className="p-5 bg-gradient-to-br from-orange-brand to-[#e85c2a] text-white border-0">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wide opacity-90">Your operation</div>
            <div className="text-xl font-bold">HustleCart Kesses — personal shopping & delivery</div>
            <div className="text-sm opacity-90 mt-1">
              You curate the catalog, shop on behalf of customers, and deliver. Profit = markup on each item + delivery fee.
            </div>
          </div>
        </div>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total orders"
          value={stats ? String(stats.totalOrders) : "0"}
          icon={<ClipboardList className="w-5 h-5" />}
          tone="navy"
        />
        <StatCard
          label="Pending"
          value={stats ? String(stats.pendingOrders) : "0"}
          icon={<Clock className="w-5 h-5" />}
          tone="amber"
        />
        <StatCard
          label="Revenue (all)"
          value={stats ? formatKES(stats.revenue) : "KSh 0"}
          icon={<TrendingUp className="w-5 h-5" />}
          tone="orange"
        />
        <StatCard
          label="Profit (est.)"
          value={stats ? formatKES(stats.profit) : "KSh 0"}
          icon={<Wallet className="w-5 h-5" />}
          tone="success"
        />
      </div>

      {/* Chart */}
      <Card className="p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="font-bold text-navy">Orders — last 7 days</h3>
          <span className="text-xs text-muted-foreground">
            Total: {chart.reduce((s, d) => s + d.count, 0)}
          </span>
        </div>
        {chart.every((d) => d.count === 0) ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            No orders yet — share HustleCart with people around Kesses to get started.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e0cd" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6b5947" }} tickLine={false} axisLine={{ stroke: "#f0e0cd" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#6b5947" }} tickLine={false} axisLine={{ stroke: "#f0e0cd" }} />
                <Tooltip
                  cursor={{ fill: "#ffe8d6" }}
                  contentStyle={{ background: "#1b263b", border: "0", borderRadius: 8, color: "#fff8f0", fontSize: 12 }}
                  labelStyle={{ color: "#fff8f0" }}
                />
                <Bar dataKey="count" fill="#ff6b35" radius={[6, 6, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Pending orders */}
      <Card className="p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-bold text-navy">Pending orders</h3>
          <Button variant="ghost" size="sm" onClick={onGoToOrders} className="text-orange-brand">
            View all <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
        {pending.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No pending orders. When customers place orders, they&rsquo;ll appear here.
          </div>
        ) : (
          <div className="space-y-2">
            {pending.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-navy">#{shortOrderId(o.id)}</span>
                    <Badge className="bg-amber-brand text-white capitalize">{humanizeStatus(o.status)}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {o.customerName} · {o.items.reduce((s, i) => s + i.quantity, 0)} item(s) · {formatKES(o.total)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Placed {formatDateShort(o.createdAt)} · profit ~{formatKES(o.profit)}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onGoToOrders}>
                  Open
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
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
          <div className="text-2xl font-extrabold text-navy mt-1 truncate">{value}</div>
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${toneClass}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

function ClipboardList({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
    </svg>
  );
}
