"use client";

// Amazon-style header.
// Top bar (dark navy): logo | "Deliver to Kesses" | search bar | account menu | cart
// Secondary bar (cream): "All" hamburger | category links | "Today's Deals"
//
// Nav differs by role:
//   - shopper: Shop | Orders (+ cart in top bar)
//   - operator: Dashboard | Browse (no cart — they fulfill orders, not place them)
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ShoppingCart,
  MapPin,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  ClipboardList,
  ShoppingBag,
  Zap,
  Share2,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Logo } from "@/components/logo";
import { useAppStore, selectCartCount } from "@/store/use-app-store";
import { formatPhone } from "@/lib/format";
import { shareApp } from "@/lib/share";
import { LoyaltyAndReferral } from "@/components/loyalty-and-referral";
import type { View } from "@/store/use-app-store";

type Category = { id: string; name: string; slug: string };

export function Header({
  categories,
  activeCategory,
  onCategory,
  query,
  onQuery,
  dealsOnly,
  onToggleDeals,
  sort,
  onSort,
}: {
  categories: Category[];
  activeCategory: string | null;
  onCategory: (slug: string | null) => void;
  query: string;
  onQuery: (q: string) => void;
  dealsOnly: boolean;
  onToggleDeals: () => void;
  sort: string;
  onSort: (s: string) => void;
}) {
  const session = useAppStore((s) => s.session);
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const setCartOpen = useAppStore((s) => s.setCartOpen);
  const setQuickOrderOpen = useAppStore((s) => s.setQuickOrderOpen);
  const cartCount = useAppStore(selectCartCount);
  const clearSession = useAppStore((s) => s.clearSession);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const router = useRouter();

  if (!session) return null;

  const isOperator = session.role === "operator";

  const navItems: { label: string; view: View; icon: React.ReactNode }[] = isOperator
    ? [
        { label: "Dashboard", view: "operator", icon: <LayoutDashboard className="w-4 h-4" /> },
        { label: "Browse", view: "shop", icon: <ShoppingBag className="w-4 h-4" /> },
      ]
    : [
        { label: "Shop", view: "shop", icon: <ShoppingBag className="w-4 h-4" /> },
        { label: "My orders", view: "orders", icon: <ClipboardList className="w-4 h-4" /> },
      ];

  function changeView(v: View) {
    setView(v);
    setMobileOpen(false);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    clearSession();
    router.refresh();
  }

  // Hide the storefront chrome (search bar, category nav) on non-shop views
  const showStoreChrome = view === "shop";

  return (
    <header className="sticky top-0 z-40">
      {/* ─── Top bar (dark navy, Amazon-style) ─────────────────────────── */}
      <div className="bg-navy text-white">
        <div className="max-w-7xl mx-auto px-3 h-14 flex items-center gap-2 sm:gap-4">
          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white hover:bg-white/10"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          {/* Logo */}
          <button
            onClick={() => changeView(isOperator ? "operator" : "shop")}
            className="flex items-center gap-2 shrink-0 border border-transparent hover:border-white/60 rounded px-1.5 py-1 transition-colors"
          >
            <Logo size="sm" />
          </button>

          {/* Desktop nav links (operator gets Dashboard / Browse; shoppers get
              their nav in the secondary bar instead). */}
          {isOperator && (
            <nav className="hidden md:flex items-center gap-1 shrink-0">
              {navItems.map((item) => (
                <button
                  key={item.view}
                  onClick={() => changeView(item.view)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    view === item.view
                      ? "bg-white/15 text-white"
                      : "text-white/90 hover:bg-white/10"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
          )}

          {/* "Deliver to" — Amazon pattern */}
          <button className="hidden sm:flex items-center gap-1 shrink-0 border border-transparent hover:border-white/60 rounded px-1.5 py-1.5 transition-colors text-left">
            <MapPin className="w-4 h-4 text-white/80" />
            <div className="leading-tight">
              <div className="text-[11px] text-white/70">Deliver to</div>
              <div className="text-sm font-bold">Kesses</div>
            </div>
          </button>

          {/* Search bar (prominent, grows) — only on shop view */}
          {showStoreChrome ? (
            <form
              className="flex-1 flex items-stretch min-w-0"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="flex-1 flex bg-white rounded-md overflow-hidden shadow-sm">
                <Input
                  type="text"
                  placeholder="Search HustleCart Kesses"
                  value={query}
                  onChange={(e) => onQuery(e.target.value)}
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-navy h-10"
                />
                <button
                  type="submit"
                  className="px-3 bg-amber-brand hover:bg-amber-brand/90 text-white flex items-center justify-center"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </form>
          ) : (
            <div className="flex-1" />
          )}

          {/* Quick order button (shoppers only) — for lazy shoppers who want
              to just type their list instead of browsing. */}
          {!isOperator && (
            <button
              onClick={() => setQuickOrderOpen(true)}
              className="hidden sm:flex items-center gap-1.5 shrink-0 bg-orange-brand hover:bg-orange-brand/90 text-white font-semibold text-sm rounded-md px-3 py-1.5 transition-colors"
            >
              <Zap className="w-4 h-4" />
              Quick order
            </button>
          )}

          {/* Account menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden sm:flex items-center gap-0.5 shrink-0 border border-transparent hover:border-white/60 rounded px-1.5 py-1 transition-colors text-left">
                <div className="leading-tight">
                  <div className="text-[11px] text-white/80">Hello, {session.name.split(" ")[0]}</div>
                  <div className="text-sm font-bold flex items-center">
                    Account & Lists
                    <ChevronDown className="w-3 h-3 ml-0.5" />
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col">
                  <span className="font-medium text-navy">{session.name}</span>
                  <span className="text-xs text-muted-foreground">{formatPhone(session.phone)}</span>
                  <Badge variant="secondary" className="mt-1 w-fit capitalize">
                    {session.role}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {!isOperator && (
                <DropdownMenuItem onClick={() => changeView("orders")}>
                  <ClipboardList className="w-4 h-4 mr-2" /> Your Orders
                </DropdownMenuItem>
              )}
              {!isOperator && (
                <DropdownMenuItem onClick={() => setRewardsOpen(true)}>
                  <Award className="w-4 h-4 mr-2" /> My Rewards
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => shareApp()}>
                <Share2 className="w-4 h-4 mr-2" /> Share HustleCart
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* "Returns & Orders" — Amazon pattern (shoppers only) */}
          {!isOperator && (
            <button
              onClick={() => changeView("orders")}
              className="hidden lg:flex flex-col shrink-0 border border-transparent hover:border-white/60 rounded px-1.5 py-1 transition-colors text-left"
            >
              <div className="text-[11px] text-white/80">Returns</div>
              <div className="text-sm font-bold">& Orders</div>
            </button>
          )}

          {/* Cart — shoppers only */}
          {!isOperator && (
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center shrink-0 border border-transparent hover:border-white/60 rounded px-1.5 py-1 transition-colors"
              aria-label={`Cart with ${cartCount} items`}
            >
              <div className="relative">
                <ShoppingCart className="w-7 h-7" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-brand text-navy text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline text-sm font-bold ml-1.5">Cart</span>
            </button>
          )}
        </div>

        {/* ─── Secondary bar (categories) — shoppers only on shop view ─── */}
        {showStoreChrome && !isOperator && (
          <div className="bg-soft-orange border-t border-navy/20">
            <div className="max-w-7xl mx-auto px-3 h-10 flex items-center gap-1 overflow-x-auto scrollbar-thin">
              <button
                onClick={() => onCategory(null)}
                className={`shrink-0 px-2.5 py-1 rounded text-sm font-medium transition-colors ${
                  activeCategory === null
                    ? "bg-navy text-white"
                    : "text-navy hover:bg-navy/10"
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onCategory(c.slug)}
                  className={`shrink-0 px-2.5 py-1 rounded text-sm font-medium transition-colors ${
                    activeCategory === c.slug
                      ? "bg-navy text-white"
                      : "text-navy hover:bg-navy/10"
                  }`}
                >
                  {c.name}
                </button>
              ))}
              <div className="w-px h-5 bg-navy/20 mx-1 shrink-0" />
              <button
                onClick={onToggleDeals}
                className={`shrink-0 px-2.5 py-1 rounded text-sm font-bold flex items-center gap-1 transition-colors ${
                  dealsOnly
                    ? "bg-orange-brand text-white"
                    : "text-orange-brand hover:bg-orange-brand/10"
                }`}
              >
                Today&rsquo;s Deals
              </button>
              <div className="flex-1" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hidden sm:flex shrink-0 items-center gap-1 px-2.5 py-1 rounded text-sm font-medium text-navy hover:bg-navy/10 transition-colors">
                    Sort: {sortLabel(sort)}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(["featured", "price-asc", "price-desc", "rating", "newest"] as const).map((s) => (
                    <DropdownMenuItem key={s} onClick={() => onSort(s)}>
                      {sort === s ? "✓ " : ""}{sortLabel(s)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </div>

      {/* ─── Mobile nav drawer ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden bg-card border-b border-border">
          <nav className="px-3 py-2 flex flex-col gap-1">
            {!isOperator && (
              <button
                onClick={() => {
                  setQuickOrderOpen(true);
                  setMobileOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-left bg-orange-brand text-white"
              >
                <Zap className="w-4 h-4" /> Quick order
              </button>
            )}
            {navItems.map((item) => (
              <button
                key={item.view}
                onClick={() => changeView(item.view)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-left ${
                  view === item.view
                    ? "bg-orange-brand text-white"
                    : "text-navy hover:bg-soft-orange"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
            <div className="border-t border-border my-1" />
            <button
              onClick={() => {
                logout();
                setMobileOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-left text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" /> Log out
            </button>
          </nav>
        </div>
      )}

      {/* Rewards dialog — loyalty stamp card + referral program */}
      <Dialog open={rewardsOpen} onOpenChange={setRewardsOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="text-navy">Your Rewards</DialogTitle>
            <DialogDescription>
              Earn stamps with every order and refer friends for bonus rewards.
            </DialogDescription>
          </DialogHeader>
          <LoyaltyAndReferral />
        </DialogContent>
      </Dialog>
    </header>
  );
}

function sortLabel(s: string): string {
  switch (s) {
    case "price-asc": return "Price: Low to High";
    case "price-desc": return "Price: High to Low";
    case "rating": return "Avg. Rating";
    case "newest": return "Newest";
    default: return "Featured";
  }
}
