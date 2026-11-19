"use client";

// OperatorShoppingList — the consolidated list of everything the operator
// needs to buy across ACCEPTED + SHOPPING orders, grouped by source shop.
// Includes the free-text lists from active quick orders.
// Items are checkable so the operator can tick them off as they shop.
import { useEffect, useState } from "react";
import {
  Store,
  MapPin,
  Package,
  Check,
  ListChecks,
  MessageSquareText,
  RefreshCw,
  Printer,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatKES, formatDateShort, shortOrderId, whatsappLink } from "@/lib/format";
import { useCallback } from "react";

type ShoppingItem = {
  shopId: string;
  shopName: string;
  shopLocation: string | null;
  productName: string;
  productId: string;
  totalQty: number;
  orderIds: string[];
};

type ShopGroup = {
  shopId: string;
  shopName: string;
  shopLocation: string | null;
  items: ShoppingItem[];
};

type CustomRequestLite = {
  id: string;
  shopperName: string;
  shopperPhone: string;
  itemsText: string;
  location: string;
  status: string;
  quotedTotal: number | null;
  createdAt: string;
};

type ShoppingListData = {
  shops: ShopGroup[];
  customRequests: CustomRequestLite[];
  orderCount: number;
  itemCount: number;
};

export function OperatorShoppingList() {
  const [data, setData] = useState<ShoppingListData | null>(null);
  const [loading, setLoading] = useState(true);
  // Checked items are kept in component state (not persisted) — they reset
  // when the operator refreshes or closes the tab, which is intentional
  // (a fresh shopping list each time they head out).
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/operator/shopping-list");
      const d = await r.json();
      setData(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(itemKey: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(itemKey)) next.delete(itemKey);
      else next.add(itemKey);
      return next;
    });
  }

  function checkAll() {
    if (!data) return;
    const all = new Set<string>();
    for (const shop of data.shops) {
      for (const item of shop.items) {
        all.add(`${shop.shopId}|${item.productId}`);
      }
    }
    setChecked(all);
    toast.success("Marked all as shopped");
  }

  function clearAll() {
    setChecked(new Set());
    toast.success("Cleared checkboxes");
  }

  if (loading) {
    return (
      <Card className="p-4 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </Card>
    );
  }

  if (!data || (data.shops.length === 0 && data.customRequests.length === 0)) {
    return (
      <Card className="py-12 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
          <ListChecks className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-navy">Nothing to shop for right now</h3>
        <p className="text-sm text-muted-foreground mt-1">
          When you accept orders (or shoppers send quick orders), the items you need
          to buy will appear here — grouped by source shop.
        </p>
        <Button className="mt-4 bg-orange-brand hover:bg-orange-brand/90" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
        </Button>
      </Card>
    );
  }

  const totalItems = data.itemCount;
  const checkedCount = checked.size;
  const progressPct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header + actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-bold text-navy text-lg">Shopping list</h2>
          <p className="text-sm text-muted-foreground">
            Everything you need to buy across {data.orderCount} active order{data.orderCount !== 1 ? "s" : ""}.
            Grouped by source shop so you can plan your trip.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1.5" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <Card className="p-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm font-medium text-navy">
            {checkedCount} of {totalItems} items shopped
          </span>
          <span className="text-xs text-muted-foreground">{progressPct}%</span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-success transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={checkAll} disabled={totalItems === 0}>
            <Check className="w-3.5 h-3.5 mr-1" /> Mark all shopped
          </Button>
          {checkedCount > 0 && (
            <Button size="sm" variant="ghost" onClick={clearAll}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Catalog items grouped by source shop */}
      {data.shops.map((shop) => {
        const shopItems = shop.items;
        const shopChecked = shopItems.filter((it) => checked.has(`${shop.shopId}|${it.productId}`)).length;
        return (
          <Card key={shop.shopId} className="overflow-hidden">
            <div className="bg-orange-brand/10 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-brand/15 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5 text-orange-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-navy">{shop.shopName}</div>
                {shop.shopLocation && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {shop.shopLocation}
                  </div>
                )}
              </div>
              <Badge variant="secondary">
                {shopChecked}/{shopItems.length} shopped
              </Badge>
            </div>
            <div className="divide-y divide-border">
              {shop.items.map((item) => {
                const key = `${shop.shopId}|${item.productId}`;
                const isChecked = checked.has(key);
                return (
                  <label
                    key={key}
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border-2 transition-all ${
                        isChecked
                          ? "bg-success border-success text-white"
                          : "border-border hover:border-success"
                      }`}
                      aria-label={isChecked ? "Marked as shopped" : "Mark as shopped"}
                    >
                      {isChecked && <Check className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium ${
                          isChecked ? "text-muted-foreground line-through" : "text-navy"
                        }`}
                      >
                        {item.productName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.orderIds.length} order{item.orderIds.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div
                      className={`font-bold text-lg ${
                        isChecked ? "text-muted-foreground" : "text-orange-brand"
                      }`}
                    >
                      ×{item.totalQty}
                    </div>
                  </label>
                );
              })}
            </div>
          </Card>
        );
      })}

      {/* Quick orders (free-text lists) */}
      {data.customRequests.length > 0 && (
        <>
          <Separator className="my-2" />
          <div className="flex items-baseline justify-between">
            <h3 className="font-bold text-navy flex items-center gap-2">
              <MessageSquareText className="w-5 h-5 text-orange-brand" />
              Quick orders to fulfill
            </h3>
            <span className="text-xs text-muted-foreground">
              {data.customRequests.length} request{data.customRequests.length !== 1 ? "s" : ""}
            </span>
          </div>
          {data.customRequests.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-navy">#{shortRequestId(r.id)}</span>
                    <Badge className="bg-amber-brand text-white capitalize">{r.status}</Badge>
                    {r.quotedTotal != null && (
                      <Badge variant="secondary">{formatKES(r.quotedTotal)}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {r.shopperName} · {formatDateShort(r.createdAt)}
                  </div>
                </div>
                <a
                  href={whatsappLink(
                    r.shopperPhone,
                    `Hello ${r.shopperName}, about your HustleCart quick order #${shortRequestId(r.id)} — you asked for: ${r.itemsText.slice(0, 200)}.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" variant="outline" className="text-success border-success/40 hover:bg-success/10">
                    Chat
                  </Button>
                </a>
              </div>
              <div className="bg-cream border border-border rounded-lg p-2.5 whitespace-pre-wrap text-sm text-navy font-medium">
                {r.itemsText}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                <MapPin className="w-3 h-3 text-orange-brand" /> Deliver to: {r.location}
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}

function shortRequestId(id: string): string {
  return id.slice(-6).toUpperCase();
}
