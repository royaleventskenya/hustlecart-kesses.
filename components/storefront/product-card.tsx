"use client";

// Amazon-style product card.
// Layout: large square image | name (2-line clamp) | stars + count |
// sale price (bold) + original strikethrough | "FREE delivery" line |
// yellow "Add to cart" button (full width).
import { Plus, Package, Truck } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarRatingDisplay } from "@/components/star-rating";
import { formatKES } from "@/lib/format";
import { useAppStore } from "@/store/use-app-store";
import { toast } from "sonner";

export type ProductListItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  originalPrice: number | null;
  stock: number;
  imageUrl: string | null;
  category: { id: string; name: string; slug: string };
  shop: { id: string; name: string; phone: string };
  reviewCount: number;
  avgRating: number;
  discountPct: number;
};

export function ProductCard({
  product,
  onOpen,
}: {
  product: ProductListItem;
  onOpen: (id: string) => void;
}) {
  const addToCart = useAppStore((s) => s.addToCart);
  const setCartOpen = useAppStore((s) => s.setCartOpen);

  const outOfStock = product.stock === 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  function quickAdd(e: React.MouseEvent) {
    e.stopPropagation();
    if (outOfStock) return;
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      shopName: product.shop.name,
    });
    toast.success("Added to cart", { description: product.name });
    setCartOpen(true);
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onClick={() => onOpen(product.id)}
      className="bg-card rounded-md border border-border overflow-hidden cursor-pointer hover:shadow-md hover:border-orange-brand/40 transition-all group flex flex-col"
    >
      {/* Image */}
      <div className="aspect-square relative bg-gradient-to-br from-soft-orange to-orange-brand/15 flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-orange-brand">
            <Package className="w-12 h-12" />
            <span className="text-3xl font-extrabold opacity-40">
              {product.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {/* Deal badge */}
        {product.discountPct > 0 && (
          <Badge className="absolute top-2 left-2 bg-orange-brand text-white font-bold">
            -{product.discountPct}%
          </Badge>
        )}
        {outOfStock ? (
          <Badge className="absolute top-2 right-2 bg-navy text-white">Out of stock</Badge>
        ) : lowStock ? (
          <Badge className="absolute top-2 right-2 bg-amber-brand text-white">
            Only {product.stock} left
          </Badge>
        ) : null}
      </div>

      {/* Body */}
      <div className="p-3 flex-1 flex flex-col">
        {/* Name */}
        <h3 className="text-sm text-navy leading-snug line-clamp-2 min-h-[2.5rem] font-medium hover:text-orange-brand transition-colors">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="mt-1">
          <StarRatingDisplay rating={product.avgRating} count={product.reviewCount} size="sm" />
        </div>

        {/* Price */}
        <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
          <span className="text-lg font-bold text-navy">
            <span className="text-xs align-top">KSh</span>{" "}
            {Math.round(product.price).toLocaleString("en-KE")}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-xs text-muted-foreground line-through">
              KSh {Math.round(product.originalPrice).toLocaleString("en-KE")}
            </span>
          )}
        </div>

        {/* FREE delivery line — Amazon pattern */}
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Truck className="w-3 h-3 text-success" />
          <span>
            <span className="text-success font-medium">FREE delivery</span>{" "}
            on KSh {Math.round(product.price).toLocaleString("en-KE")}+
          </span>
        </p>

        {/* Vendor */}
        <p className="text-xs text-muted-foreground mt-1 truncate">
          from <span className="text-navy font-medium">{product.shop.name}</span>
        </p>

        {/* Add to cart — yellow, full width */}
        <Button
          size="sm"
          onClick={quickAdd}
          disabled={outOfStock}
          className="mt-2 w-full bg-amber-brand hover:bg-amber-brand/90 text-navy font-semibold h-9"
        >
          {outOfStock ? (
            "Out of stock"
          ) : (
            <>
              <Plus className="w-4 h-4 mr-1" /> Add to cart
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
