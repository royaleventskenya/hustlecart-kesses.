"use client";

// Product grid — responsive columns, with empty-state handling.
import { PackageOpen } from "lucide-react";
import { ProductCard, type ProductListItem } from "./product-card";

export function ProductGrid({
  products,
  onOpen,
}: {
  products: ProductListItem[];
  onOpen: (id: string) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
          <PackageOpen className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-navy">No products found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Try a different search or category.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onOpen={onOpen} />
      ))}
    </div>
  );
}
