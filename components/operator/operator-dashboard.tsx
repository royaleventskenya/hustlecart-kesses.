"use client";

// OperatorDashboard — for the single operator who runs HustleCart Kesses.
// Tabs: Overview | Catalog | Source shops | Orders | Requests | Shopping list
// Also subscribes to live new-order notifications (sound + browser notification
// + toast) so the operator doesn't miss incoming orders.
import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Store,
  ClipboardList,
  MessageSquareText,
  ListChecks,
  Users,
  Bell,
  BellOff,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { OperatorOverview } from "./operator-overview";
import { OperatorProducts } from "./operator-products";
import { OperatorShops } from "./operator-shops";
import { OperatorOrders } from "./operator-orders";
import { OperatorRequests } from "./operator-requests";
import { OperatorShoppingList } from "./operator-shopping-list";
import { OperatorCustomers } from "./operator-customers";
import { OperatorDeliveryZones } from "./operator-delivery-zones";
import { OperatorDailySummary } from "./operator-daily-summary";
import { useOperatorNotifications } from "@/hooks/use-operator-notifications";

type Tab = "overview" | "products" | "shops" | "orders" | "requests" | "shopping-list" | "customers" | "delivery-zones" | "daily-summary";

export function OperatorDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  // Subscribes to the operator WebSocket room on mount; fires a chime + toast
  // + browser notification (if permission granted) for every new order/request.
  const { permission, enableNotifications } = useOperatorNotifications();

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "orders", label: "Orders", icon: <ClipboardList className="w-4 h-4" /> },
    { id: "requests", label: "Quick orders", icon: <MessageSquareText className="w-4 h-4" /> },
    { id: "shopping-list", label: "Shopping list", icon: <ListChecks className="w-4 h-4" /> },
    { id: "daily-summary", label: "Daily summary", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "customers", label: "Customers", icon: <Users className="w-4 h-4" /> },
    { id: "products", label: "Catalog", icon: <Package className="w-4 h-4" /> },
    { id: "shops", label: "Source shops", icon: <Store className="w-4 h-4" /> },
    { id: "delivery-zones", label: "Delivery zones", icon: <MapPin className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Notification permission banner — shown until the operator enables
          notifications (or dismisses). Helps them not miss orders. */}
      {permission === "default" && (
        <div className="mb-4 bg-orange-brand/10 border border-orange-brand/30 rounded-lg p-3 flex items-center gap-3 flex-wrap">
          <Bell className="w-5 h-5 text-orange-brand shrink-0" />
          <div className="flex-1 min-w-[200px]">
            <div className="text-sm font-semibold text-navy">
              Get notified when orders come in
            </div>
            <div className="text-xs text-muted-foreground">
              Enable notifications so you hear a chime + see an alert even when this tab is in the background.
            </div>
          </div>
          <Button
            size="sm"
            className="bg-orange-brand hover:bg-orange-brand/90"
            onClick={enableNotifications}
          >
            Enable
          </Button>
        </div>
      )}
      {permission === "denied" && (
        <div className="mb-4 bg-muted/40 border border-border rounded-lg p-3 flex items-center gap-3">
          <BellOff className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-medium text-navy">Notifications blocked</div>
            <div className="text-xs text-muted-foreground">
              You&rsquo;ll still get toasts + chime while this tab is open. Enable notifications in your browser settings for background alerts.
            </div>
          </div>
        </div>
      )}
      {permission === "granted" && (
        <div className="mb-4 bg-success/10 border border-success/30 rounded-lg p-2 flex items-center gap-2">
          <Bell className="w-4 h-4 text-success shrink-0" />
          <div className="text-xs text-success font-medium">
            Notifications on — you&rsquo;ll hear a chime + see a browser alert for every new order.
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-border mb-6 overflow-x-auto scrollbar-thin">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === t.id
                ? "border-orange-brand text-orange-brand"
                : "border-transparent text-muted-foreground hover:text-navy"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {tab === "overview" && <OperatorOverview onGoToOrders={() => setTab("orders")} />}
        {tab === "products" && <OperatorProducts />}
        {tab === "shops" && <OperatorShops />}
        {tab === "orders" && <OperatorOrders />}
        {tab === "requests" && <OperatorRequests />}
        {tab === "shopping-list" && <OperatorShoppingList />}
        {tab === "customers" && <OperatorCustomers />}
        {tab === "delivery-zones" && <OperatorDeliveryZones />}
        {tab === "daily-summary" && <OperatorDailySummary />}
      </motion.div>
    </div>
  );
}
