"use client";

// Order list (shopper) — shows recent orders; clicking one opens the tracking view.
// Each order also has a "Buy again" button that re-adds all its items to the cart.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, PackageSearch, MessageCircle, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/use-app-store";
import { formatKES, formatDateShort, humanizeStatus, shortOrderId, whatsappLink } from "@/lib/format";
import { toast } from "sonner";

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  productId: string;
  product: { shop: { id: string; name: string; phone: string } };
};
type Order = {
  id: string;
  status: string;
  total: number;
  deliveryFee: number;
  paymentMethod: string;
  deliveryLocation: string;
  createdAt: string;
  items: OrderItem[];
  statusEvents: { id: string; status: string; note: string | null; createdAt: string }[];
};

function statusBadge(status: string) {
  const map: Record<string, string> = {
    PLACED: "bg-navy text-white",
    CONFIRMED: "bg-orange-brand text-white",
    PACKING: "bg-amber-brand text-white",
    OUT_FOR_DELIVERY: "bg-orange-brand text-white",
    DELIVERED: "bg-success text-white",
    CANCELLED: "bg-destructive text-white",
  };
  return <Badge className={map[status] || "bg-muted"}>{humanizeStatus(status)}</Badge>;
}

export function OrderList() {
  const setActiveOrderId = useAppStore((s) => s.setActiveOrderId);
  const setView = useAppStore((s) => s.setView);
  const addToCart = useAppStore((s) => s.addToCart);
  const setCartOpen = useAppStore((s) => s.setCartOpen);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders/mine")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .finally(() => setLoading(false));
  }, []);

  function openTracking(id: string) {
    setActiveOrderId(id);
    setView("tracking");
  }

  // "Buy again" — re-adds all items from a past order to the cart, then opens
  // the cart drawer so the shopper can review + checkout.
  function buyAgain(o: Order) {
    let added = 0;
    for (const it of o.items) {
      addToCart({
        productId: it.productId,
        name: it.name,
        price: it.price,
        imageUrl: null,
        shopName: it.product?.shop?.name || "HustleCart",
      }, it.quantity);
      added += it.quantity;
    }
    toast.success(`Added ${added} item(s) from order #${shortOrderId(o.id)}`, {
      description: "Review your cart and checkout.",
    });
    setCartOpen(true);
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
          <PackageSearch className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-navy text-lg">No orders yet</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          When you place an order, you can track it here in real time.
        </p>
        <Button className="bg-orange-brand hover:bg-orange-brand/90" onClick={() => setView("shop")}>
          Start shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-lg font-bold text-navy">My orders</h2>
        <span className="text-xs text-muted-foreground">{orders.length} total</span>
      </div>

      {orders.map((o, i) => {
        const shopPhone = o.items[0]?.product?.shop?.phone;
        return (
          <motion.div
            key={o.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
          >
            <Card className="p-4 hover:border-orange-brand/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-navy">#{shortOrderId(o.id)}</span>
                    {statusBadge(o.status)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {o.items.length} item{o.items.length !== 1 ? "s" : ""} · {formatKES(o.total)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Placed {formatDateShort(o.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {shopPhone && (
                    <a
                      href={whatsappLink(
                        shopPhone,
                        `Hello, I have a question about my HustleCart Kesses order #${shortOrderId(o.id)}.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-success"
                        aria-label="Chat with HustleCart"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-orange-brand border-orange-brand/40 hover:bg-orange-brand/10"
                    onClick={() => buyAgain(o)}
                    aria-label="Buy again"
                  >
                    <Repeat2 className="w-3.5 h-3.5 mr-1" />
                    Buy again
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => openTracking(o.id)}
                    aria-label="Track order"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
