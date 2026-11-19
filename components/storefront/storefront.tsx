"use client";

// Amazon-style storefront homepage.
// Layout:
//   1. Hero banner (orange gradient with headline + value props)
//   2. Category tiles grid (visual category cards)
//   3. Today's Deals strip (products with discountPct > 0)
//   4. Product grid (filtered by category/search/deals + sort)
// State is owned by the parent Header (search, category, deals, sort) and
// passed down as props. This keeps the Header + Storefront in sync.
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Package,
  ShoppingBag,
  Apple,
  Wine,
  Home,
  Sparkles,
  Cookie,
  Croissant,
  Truck,
  ShieldCheck,
  Wallet,
  Flame,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductGrid, type ProductListItem } from "./product-grid";
import { ProductDetailDialog } from "./product-detail-dialog";
import type { Category } from "./category-chips";

// Hero icons for value props
const HERO_ICONS = { Truck, ShieldCheck, Wallet };

export function Storefront({
  categories,
  activeCategory,
  onCategory,
  query,
  dealsOnly,
  onToggleDeals,
  sort,
}: {
  categories: Category[];
  activeCategory: string | null;
  onCategory: (slug: string | null) => void;
  query: string;
  dealsOnly: boolean;
  onToggleDeals: () => void;
  sort: string;
}) {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openProductId, setOpenProductId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (activeCategory) sp.set("category", activeCategory);
    if (query.trim()) sp.set("q", query.trim());
    if (dealsOnly) sp.set("deals", "true");
    if (sort) sp.set("sort", sort);
    try {
      const res = await fetch(`/api/products?${sp.toString()}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, query, dealsOnly, sort]);

  useEffect(() => {
    const t = setTimeout(fetchProducts, query ? 250 : 0);
    return () => clearTimeout(t);
  }, [fetchProducts, query]);

  const deals = products.filter((p) => p.discountPct > 0);
  const showingDealsStrip = !dealsOnly && !activeCategory && !query.trim() && deals.length > 0;
  const gridProducts = dealsOnly ? products : products;

  return (
    <div className="bg-cream">
      {/* ─── Hero banner ─────────────────────────────────────────── */}
      {!activeCategory && !query.trim() && !dealsOnly && (
        <Hero />
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-5 space-y-6">
        {/* ─── Category tiles grid ─────────────────────────────────── */}
        {!activeCategory && !query.trim() && !dealsOnly && (
          <CategoryTiles categories={categories} onSelect={onCategory} />
        )}

        {/* ─── Today's Deals strip ────────────────────────────────── */}
        {showingDealsStrip && (
          <section className="bg-card rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-brand" />
                Today&rsquo;s Deals
              </h2>
              <button
                onClick={onToggleDeals}
                className="text-sm text-orange-brand font-medium hover:underline"
              >
                See all deals →
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {deals.slice(0, 6).map((p) => (
                <DealsCard key={p.id} product={p} onOpen={setOpenProductId} />
              ))}
            </div>
          </section>
        )}

        {/* ─── Product grid ───────────────────────────────────────── */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-bold text-navy">
              {dealsOnly
                ? "All deals"
                : activeCategory
                ? categories.find((c) => c.slug === activeCategory)?.name ?? "Products"
                : query.trim()
                ? `Results for "${query.trim()}"`
                : "Top picks for you"}
            </h2>
            {!loading && (
              <span className="text-xs text-muted-foreground">
                {products.length} result{products.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-md" />
              ))}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              <ProductGrid products={gridProducts} onOpen={setOpenProductId} />
            </motion.div>
          )}
        </section>
      </div>

      <ProductDetailDialog productId={openProductId} onClose={() => setOpenProductId(null)} />
    </div>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-orange-brand via-[#ff7a47] to-[#e85c2a] text-white overflow-hidden">
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute -top-12 -right-12 w-72 h-72 rounded-full bg-white" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white" />
      </div>
      <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14 relative">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-2xl"
        >
          <span className="inline-block bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-1 rounded-full text-xs font-medium mb-3">
            Kesses · Uasin Gishu · Kenya
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            We shop for you. <br className="hidden sm:block" />
            We deliver to your door.
          </h1>
          <p className="mt-3 text-white/90 text-sm sm:text-base max-w-xl">
            Too lazy to go to the shop? HustleCart Kesses is your personal shopper.
            Browse, order, and we&rsquo;ll buy from local vendors and bring it to you —
            groceries, household goods, fresh produce, and more.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 max-w-2xl">
            <HeroTile icon={<Truck className="w-4 h-4" />} label="Same-day delivery" />
            <HeroTile icon={<Wallet className="w-4 h-4" />} label="Cash on delivery" />
            <HeroTile icon={<ShieldCheck className="w-4 h-4" />} label="Personal shopper" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function HeroTile({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-2.5 py-2">
      <span className="shrink-0">{icon}</span>
      <span className="text-xs sm:text-sm font-medium leading-tight">{label}</span>
    </div>
  );
}

// ─── Category tiles ───────────────────────────────────────────────────
const CATEGORY_META: Record<string, { icon: React.ReactNode; gradient: string }> = {
  groceries: { icon: <ShoppingBag className="w-7 h-7" />, gradient: "from-orange-brand/20 to-orange-brand/5" },
  household: { icon: <Home className="w-7 h-7" />, gradient: "from-orange-brand/20 to-orange-brand/5" },
  "fresh-produce": { icon: <Apple className="w-7 h-7" />, gradient: "from-success/20 to-success/5" },
  drinks: { icon: <Wine className="w-7 h-7" />, gradient: "from-orange-brand/20 to-orange-brand/5" },
  "personal-care": { icon: <Sparkles className="w-7 h-7" />, gradient: "from-orange-brand/20 to-orange-brand/5" },
  snacks: { icon: <Cookie className="w-7 h-7" />, gradient: "from-orange-brand/20 to-orange-brand/5" },
  bakery: { icon: <Croissant className="w-7 h-7" />, gradient: "from-orange-brand/20 to-orange-brand/5" },
};

function CategoryTiles({
  categories,
  onSelect,
}: {
  categories: Category[];
  onSelect: (slug: string) => void;
}) {
  return (
    <section>
      <h2 className="text-lg font-bold text-navy mb-3">Shop by category</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {categories.map((c) => {
          const meta = CATEGORY_META[c.slug] || {
            icon: <Package className="w-7 h-7" />,
            gradient: "from-orange-brand/20 to-orange-brand/5",
          };
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.slug)}
              className="bg-card rounded-lg border border-border hover:border-orange-brand/40 hover:shadow-md transition-all p-4 flex flex-col items-center text-center group"
            >
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-orange-brand mb-2 group-hover:scale-110 transition-transform`}>
                {meta.icon}
              </div>
              <div className="text-sm font-medium text-navy">{c.name}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ─── Deals card (compact horizontal card for the strip) ───────────────
function DealsCard({
  product,
  onOpen,
}: {
  product: ProductListItem;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onOpen(product.id)}
      className="text-left bg-cream hover:bg-soft-orange rounded-md border border-border p-2 transition-colors group"
    >
      <div className="aspect-square rounded bg-gradient-to-br from-soft-orange to-orange-brand/15 flex items-center justify-center overflow-hidden mb-1.5 relative">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-8 h-8 text-orange-brand opacity-50" />
        )}
        <span className="absolute top-1 left-1 bg-orange-brand text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
          -{product.discountPct}%
        </span>
      </div>
      <div className="text-xs font-medium text-navy line-clamp-2 min-h-[2rem]">{product.name}</div>
      <div className="text-sm font-bold text-navy mt-0.5">
        KSh {Math.round(product.price).toLocaleString("en-KE")}
      </div>
      <div className="text-[10px] text-muted-foreground line-through">
        KSh {Math.round(product.originalPrice || 0).toLocaleString("en-KE")}
      </div>
    </button>
  );
}
