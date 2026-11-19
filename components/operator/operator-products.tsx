"use client";

// OperatorProducts — table of products with costPrice + sellingPrice + source shop.
// Add / edit / delete via the product form dialog.
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatKES } from "@/lib/format";
import { ProductFormDialog } from "./product-form-dialog";

type Category = { id: string; name: string; slug: string };
type SourceShop = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  costPrice: number | null;
  originalPrice: number | null;
  stock: number;
  imageUrl: string | null;
  category: Category;
  shop: { id: string; name: string };
};

export function OperatorProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shops, setShops] = useState<SourceShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [pRes, cRes, sRes] = await Promise.all([
        fetch("/api/operator/products"),
        fetch("/api/categories"),
        fetch("/api/operator/shops"),
      ]);
      const pData = await pRes.json();
      const cData = await cRes.json();
      const sData = await sRes.json();
      setProducts(pData.products || []);
      setCategories(cData.categories || []);
      setShops(sData.shops || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function statusBadge(stock: number) {
    if (stock === 0) return <Badge className="bg-navy text-white">Out of stock</Badge>;
    if (stock <= 5) return <Badge className="bg-amber-brand text-white">Low · {stock}</Badge>;
    return <Badge className="bg-success text-white">In stock · {stock}</Badge>;
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/operator/products/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "Could not delete.");
        return;
      }
      toast.success("Product deleted", { description: deleting.name });
      await load();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-bold text-navy text-lg">Catalog</h2>
          <p className="text-sm text-muted-foreground">
            Products you offer. Markup = selling price − cost price.
          </p>
        </div>
        <Button
          className="bg-orange-brand hover:bg-orange-brand/90"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add product
        </Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
              <Package className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-navy">No products yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Add your first product to start offering it to shoppers.
            </p>
            <Button
              className="bg-orange-brand hover:bg-orange-brand/90"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add your first product
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Source shop</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Sell</TableHead>
                  <TableHead className="text-right">Markup</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const markup = p.costPrice != null ? p.price - p.costPrice : null;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-navy">{p.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.shop.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.category.name}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {p.costPrice != null ? formatKES(p.costPrice) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-navy">{formatKES(p.price)}</TableCell>
                      <TableCell className="text-right font-semibold text-success">
                        {markup != null ? `+${formatKES(markup)}` : "—"}
                      </TableCell>
                      <TableCell>{statusBadge(p.stock)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditing(p);
                            setFormOpen(true);
                          }}
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleting(p)}
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        shops={shops}
        editing={editing}
        onSaved={load}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove &ldquo;{deleting?.name}&rdquo; from your catalog. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
