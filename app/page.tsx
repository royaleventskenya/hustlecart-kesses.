"use client";

// HustleCart Kesses — single-page app root.
// Reads session on mount; renders the right view based on role.
import { useEffect, useState } from "react";
import { useAppStore } from "@/store/use-app-store";
import { AuthScreen } from "@/components/auth-screen";
import { LandingScreen } from "@/components/landing-screen";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Storefront } from "@/components/storefront/storefront";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { QuickOrderDialog } from "@/components/storefront/quick-order-dialog";
import { OrderList } from "@/components/orders/order-list";
import { OrderTracking } from "@/components/orders/order-tracking";
import { OperatorDashboard } from "@/components/operator/operator-dashboard";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { BagKMark } from "@/components/logo";

type Category = { id: string; name: string; slug: string };

export default function Home() {
  const session = useAppStore((s) => s.session);
  const setSession = useAppStore((s) => s.setSession);
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const authMode = useAppStore((s) => s.authMode);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Storefront filter state (owned here so Header + Storefront stay in sync).
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dealsOnly, setDealsOnly] = useState(false);
  const [sort, setSort] = useState("featured");

  // Rehydrate session from the server cookie on first load.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => {
        if (!cancelled) {
          if (d.user) setSession(d.user);
          setBootstrapping(false);
        }
      })
      .catch(() => {
        if (!cancelled) setBootstrapping(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setSession]);

  // Load categories once.
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => setCategories([]));
  }, []);

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream">
        <div className="animate-pulse">
          <BagKMark width={64} height={64} />
        </div>
        <div className="mt-4 text-sm text-muted-foreground">Loading HustleCart Kesses…</div>
      </div>
    );
  }

  if (!session) {
    // If authMode is null, show the landing page (choose shopper vs operator).
    // Otherwise show the auth screen for the selected mode.
    if (!authMode) return <LandingScreen />;
    return <AuthScreen mode={authMode} />;
  }

  const isOperator = session.role === "operator";

  // Operators land on the dashboard; shoppers land on the storefront.
  let effectiveView = view;
  if (isOperator) {
    if (view === "tracking" || view === "orders") effectiveView = "operator";
  } else {
    // Shoppers can't access operator-only views.
    if (view === "operator") effectiveView = "shop";
  }

  function toggleDeals() {
    setDealsOnly((v) => !v);
    setActiveCategory(null);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        categories={categories}
        activeCategory={activeCategory}
        onCategory={(slug) => {
          setActiveCategory(slug);
          setDealsOnly(false);
        }}
        query={query}
        onQuery={setQuery}
        dealsOnly={dealsOnly}
        onToggleDeals={toggleDeals}
        sort={sort}
        onSort={setSort}
      />
      <main className="flex-1 pb-14 md:pb-0">
        {effectiveView === "shop" && (
          <Storefront
            categories={categories}
            activeCategory={activeCategory}
            onCategory={(slug) => {
              setActiveCategory(slug);
              setDealsOnly(false);
            }}
            query={query}
            dealsOnly={dealsOnly}
            onToggleDeals={toggleDeals}
            sort={sort}
          />
        )}
        {effectiveView === "orders" && <OrderList />}
        {effectiveView === "tracking" && <OrderTracking />}
        {effectiveView === "operator" && isOperator && <OperatorDashboard />}
      </main>
      <Footer />
      {session.role === "shopper" && <CartDrawer />}
      {session.role === "shopper" && <QuickOrderDialogStorefront />}
      {session.role === "shopper" && <MobileBottomNav />}
    </div>
  );
}

// Tiny wrapper that pulls quickOrderOpen + setQuickOrderOpen from the store
// so we don't have to plumb it through the whole tree.
function QuickOrderDialogStorefront() {
  const open = useAppStore((s) => s.quickOrderOpen);
  const setOpen = useAppStore((s) => s.setQuickOrderOpen);
  return <QuickOrderDialog open={open} onOpenChange={setOpen} />;
}
