"use client";

// MobileBottomNav — fixed bottom navigation bar for shoppers on mobile.
// Only shows on screens < md (768px) and only for shoppers.
// Tabs: Shop | Quick Order | Orders
import { ShoppingBag, Zap, ClipboardList } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import type { View } from "@/store/use-app-store";

export function MobileBottomNav() {
  const session = useAppStore((s) => s.session);
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const setQuickOrderOpen = useAppStore((s) => s.setQuickOrderOpen);
  const cartCount = useAppStore((s) => s.cart.reduce((sum, c) => sum + c.quantity, 0));
  const setCartOpen = useAppStore((s) => s.setCartOpen);

  if (!session || session.role !== "shopper") return null;

  const items: { label: string; icon: React.ReactNode; onClick: () => void; active: boolean; badge?: number }[] = [
    {
      label: "Shop",
      icon: <ShoppingBag className="w-5 h-5" />,
      onClick: () => setView("shop"),
      active: view === "shop",
    },
    {
      label: "Quick",
      icon: <Zap className="w-5 h-5" />,
      onClick: () => setQuickOrderOpen(true),
      active: false,
    },
    {
      label: "Cart",
      icon: <ShoppingBag className="w-5 h-5" />,
      onClick: () => setCartOpen(true),
      active: false,
      badge: cartCount > 0 ? cartCount : undefined,
    },
    {
      label: "Orders",
      icon: <ClipboardList className="w-5 h-5" />,
      onClick: () => setView("orders"),
      active: view === "orders" || view === "tracking",
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border grid grid-cols-4 h-14 safe-area-pb">
      {items.map((item, i) => (
        <button
          key={i}
          onClick={item.onClick}
          className={`flex flex-col items-center justify-center gap-0.5 relative transition-colors ${
            item.active ? "text-orange-brand" : "text-muted-foreground"
          }`}
        >
          <div className="relative">
            {item.icon}
            {item.badge != null && (
              <span className="absolute -top-1.5 -right-2 bg-orange-brand text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                {item.badge}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">{item.label}</span>
          {item.active && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-orange-brand rounded-full" />
          )}
        </button>
      ))}
    </nav>
  );
}
