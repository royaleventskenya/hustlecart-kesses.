"use client";

// Amazon-style product detail dialog.
// Layout (2 columns on desktop, stacked on mobile):
//   LEFT  — large image, with sale badge if any
//   RIGHT — title, brand (shop), rating link, big price, "In stock" badge,
//           bullets (description + key info), quantity selector,
//           "Add to Cart" (yellow) + "Buy Now" (orange), "FREE delivery" line,
//           shop info card with WhatsApp button
// BELOW — customer reviews section (summary + distribution + list + form)
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Minus,
  Plus,
  ShoppingCart,
  Package,
  Store,
  MapPin,
  MessageCircle,
  Truck,
  CheckCircle2,
  Bolt,
} from "lucide-react";
import { toast } from "sonner";
import { formatKES, whatsappLink, formatDateShort } from "@/lib/format";
import { useAppStore } from "@/store/use-app-store";
import { StarRatingDisplay } from "@/components/star-rating";
import { ReviewList, type Review } from "@/components/reviews/review-list";

type ProductDetail = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  originalPrice: number | null;
  stock: number;
  imageUrl: string | null;
  category: { id: string; name: string; slug: string };
  shop: {
    id: string;
    name: string;
    phone: string;
    location: string | null;
    description: string | null;
  };
  reviewCount: number;
  avgRating: number;
  discountPct: number;
};

type ReviewSummary = {
  reviews: Review[];
  count: number;
  average: number;
  distribution: { star: number; count: number }[];
};

export function ProductDetailDialog({
  productId,
  onClose,
}: {
  productId: string | null;
  onClose: () => void;
}) {
  const open = productId !== null;
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [operatorPhone, setOperatorPhone] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [qty, setQty] = useState(1);
  const addToCart = useAppStore((s) => s.addToCart);
  const setCartOpen = useAppStore((s) => s.setCartOpen);
  const setActiveOrderId = useAppStore((s) => s.setActiveOrderId);
  const session = useAppStore((s) => s.session);

  // Fetch product
  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/products/${productId}`);
        const d = await r.json();
        if (!cancelled) {
          if (d.product) setProduct(d.product);
          if (d.operatorPhone) setOperatorPhone(d.operatorPhone);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  // Fetch reviews
  useEffect(() => {
    if (!productId) {
      setReviews(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/products/${productId}/reviews`);
        const d = await r.json();
        if (!cancelled) setReviews(d);
      } catch {
        if (!cancelled) setReviews({ reviews: [], count: 0, average: 0, distribution: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  function handleClose() {
    setProduct(null);
    setOperatorPhone(null);
    setReviews(null);
    setQty(1);
    setLoading(false);
    onClose();
  }

  function handleAddToCart() {
    if (!product || product.stock === 0) return;
    addToCart(
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        shopName: product.shop.name,
      },
      qty
    );
    toast.success("Added to cart", { description: `${qty} × ${product.name}` });
    setCartOpen(true);
    handleClose();
  }

  // "Buy Now" — Amazon's 1-click: adds to cart, opens checkout directly.
  function handleBuyNow() {
    if (!product || product.stock === 0) return;
    addToCart(
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        shopName: product.shop.name,
      },
      qty
    );
    handleClose();
    // Open the cart drawer which has the Checkout button. (Amazon's real
    // 1-click skips the cart entirely, but we don't have stored payment
    // methods, so routing through checkout is the closest equivalent.)
    setCartOpen(true);
  }

  const outOfStock = product?.stock === 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="sr-only">{product?.name ?? "Product"}</DialogTitle>
          <DialogDescription className="sr-only">
            Product details, add to cart, and customer reviews.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        )}

        {!loading && product && (
          <div className="space-y-6">
            {/* ─── Top: image + info ──────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6">
              {/* LEFT — image */}
              <div className="sm:col-span-5">
                <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-soft-orange to-orange-brand/15 flex items-center justify-center relative">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-orange-brand">
                      <Package className="w-16 h-16" />
                      <span className="text-4xl font-extrabold opacity-40">
                        {product.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  {product.discountPct > 0 && (
                    <Badge className="absolute top-3 left-3 bg-orange-brand text-white font-bold text-sm">
                      -{product.discountPct}%
                    </Badge>
                  )}
                </div>
              </div>

              {/* RIGHT — info */}
              <div className="sm:col-span-7 space-y-3">
                {/* Shop/brand */}
                <div className="text-sm text-muted-foreground">
                  from <span className="text-orange-brand font-semibold">{product.shop.name}</span>
                </div>

                {/* Title */}
                <h2 className="text-xl sm:text-2xl font-bold text-navy leading-snug">
                  {product.name}
                </h2>

                {/* Rating */}
                <div className="flex items-center gap-2 flex-wrap">
                  <StarRatingDisplay rating={product.avgRating} count={product.reviewCount} size="md" />
                  <span className="text-sm text-orange-brand hover:underline cursor-pointer">
                    {product.reviewCount > 0 ? `${product.reviewCount} ratings` : "Be the first to review"}
                  </span>
                </div>

                <Separator />

                {/* Price */}
                <div className="space-y-1">
                  {product.discountPct > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-orange-brand text-white">Deal</Badge>
                      <span className="text-sm text-orange-brand font-semibold">
                        -{product.discountPct}%
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-3xl font-bold text-navy">
                      <span className="text-base align-top">KSh</span>{" "}
                      {Math.round(product.price).toLocaleString("en-KE")}
                    </span>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <span className="text-base text-muted-foreground line-through">
                        KSh {Math.round(product.originalPrice).toLocaleString("en-KE")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cash on delivery supported. Online payment coming soon.
                  </p>
                </div>

                {/* Stock */}
                <div>
                  {outOfStock ? (
                    <span className="text-destructive font-medium">Currently unavailable.</span>
                  ) : product.stock <= 5 ? (
                    <span className="text-amber-brand font-medium">
                      Only {product.stock} left — order soon.
                    </span>
                  ) : (
                    <span className="text-success font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> In stock
                    </span>
                  )}
                </div>

                {/* FREE delivery */}
                {!outOfStock && (
                  <div className="bg-muted/40 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="w-4 h-4 text-success" />
                      <div>
                        <div>
                          <span className="text-success font-semibold">FREE delivery</span>{" "}
                          by HustleCart Kesses
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Within Kesses · Same-day for orders before 3pm
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bullets */}
                {product.description && (
                  <ul className="text-sm text-foreground space-y-1.5 mt-2">
                    {product.description
                      .split(/\.\s+|\n/)
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .slice(0, 6)
                      .map((line, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-orange-brand mt-1.5 w-1 h-1 rounded-full bg-orange-brand shrink-0" />
                          <span>{line}{!/[\.\!\?]$/.test(line) ? "." : ""}</span>
                        </li>
                      ))}
                  </ul>
                )}

                {/* Quantity + actions */}
                {!outOfStock && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3">
                      <Label className="text-sm font-medium text-navy">Qty:</Label>
                      <div className="flex items-center border border-border rounded-lg overflow-hidden">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-none"
                          onClick={() => setQty((q) => Math.max(1, q - 1))}
                          disabled={qty <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-10 text-center font-semibold text-navy">{qty}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-none"
                          onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                          disabled={qty >= product.stock}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Add to Cart + Buy Now — Amazon yellow + orange */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button
                        onClick={handleAddToCart}
                        className="h-11 bg-amber-brand hover:bg-amber-brand/90 text-navy font-bold"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Add to Cart
                      </Button>
                      <Button
                        onClick={handleBuyNow}
                        className="h-11 bg-orange-brand hover:bg-orange-brand/90 text-white font-bold"
                      >
                        <Bolt className="w-4 h-4 mr-2" />
                        Buy Now
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─── HustleCart info card ───────────────────────────────── */}
            <div className="bg-muted/40 rounded-lg p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-brand/15 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5 text-orange-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-navy">Sourced from {product.shop.name}</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your HustleCart personal shopper will buy this on your behalf and deliver it.
                </p>
                {product.shop.location && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-orange-brand" /> {product.shop.location}
                  </div>
                )}
              </div>
              {operatorPhone && (
                <a
                  href={whatsappLink(
                    operatorPhone,
                    `Hello HustleCart, I have a question about ${product.name}.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" variant="outline" className="text-success border-success/40 hover:bg-success/10">
                    <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                    Chat
                  </Button>
                </a>
              )}
            </div>

            <Separator />

            {/* ─── Reviews ──────────────────────────────────────────── */}
            {reviews && (
              <ReviewList
                productId={product.id}
                reviews={reviews.reviews}
                count={reviews.count}
                average={reviews.average}
                distribution={reviews.distribution}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
