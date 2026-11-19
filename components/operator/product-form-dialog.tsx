"use client";

// Operator product form dialog — create/edit a product in the operator's catalog.
// Fields: name, description, source shop, category, costPrice (what operator pays),
// selling price, originalPrice (for deals), stock, image upload.
import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, X, Image as ImageIcon, Link as LinkIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

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

export function ProductFormDialog({
  open,
  onOpenChange,
  categories,
  shops,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  categories: Category[];
  shops: SourceShop[];
  editing: Product | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shopId, setShopId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageMode, setImageMode] = useState<"upload" | "url">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name);
        setDescription(editing.description || "");
        setShopId(editing.shop.id);
        setCategoryId(editing.category.id);
        setCostPrice(editing.costPrice != null ? String(editing.costPrice) : "");
        setPrice(String(editing.price));
        setOriginalPrice(editing.originalPrice != null ? String(editing.originalPrice) : "");
        setStock(String(editing.stock));
        setImageUrl(editing.imageUrl || "");
        setImageMode(editing.imageUrl && editing.imageUrl.startsWith("/uploads/") ? "upload" : "url");
      } else {
        setName("");
        setDescription("");
        setShopId(shops[0]?.id || "");
        setCategoryId(categories[0]?.id || "");
        setCostPrice("");
        setPrice("");
        setOriginalPrice("");
        setStock("");
        setImageUrl("");
        setImageMode("upload");
      }
    }
  }, [open, editing, categories, shops]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max 5MB.");
      return;
    }
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Use JPG, PNG, or WebP.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/operator/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Upload failed.");
        return;
      }
      setImageUrl(data.url);
      toast.success("Image uploaded", { description: file.name });
    } catch (e) {
      console.error(e);
      toast.error("Network error during upload.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function save() {
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Enter a product name.");
      return;
    }
    if (!shopId) {
      toast.error("Pick a source shop.");
      return;
    }
    if (!categoryId) {
      toast.error("Pick a category.");
      return;
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast.error("Enter a valid selling price.");
      return;
    }
    const costNum = costPrice.trim() === "" ? null : Number(costPrice);
    if (costNum !== null && (!Number.isFinite(costNum) || costNum < 0)) {
      toast.error("Enter a valid cost price (or leave blank).");
      return;
    }
    const origNum = originalPrice.trim() === "" ? null : Number(originalPrice);
    if (origNum !== null) {
      if (!Number.isFinite(origNum) || origNum <= 0) {
        toast.error("Enter a valid original price (or leave blank).");
        return;
      }
      if (origNum <= priceNum) {
        toast.error("Original price must be higher than the selling price to be a deal.");
        return;
      }
    }
    const stockNum = Math.floor(Number(stock));
    if (!Number.isFinite(stockNum) || stockNum < 0) {
      toast.error("Enter a valid stock count.");
      return;
    }

    setSubmitting(true);
    try {
      const url = editing ? `/api/operator/products/${editing.id}` : "/api/operator/products";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          shopId,
          categoryId,
          costPrice: costNum,
          price: priceNum,
          originalPrice: origNum,
          stock: stockNum,
          imageUrl: imageUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not save.");
        setSubmitting(false);
        return;
      }
      toast.success(editing ? "Product updated" : "Product added", { description: name.trim() });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="text-navy">
            {editing ? "Edit product" : "Add product"}
          </DialogTitle>
          <DialogDescription>
            {editing ? "Update the details below." : "Add a product to your catalog."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="pf-name">Name</Label>
            <Input
              id="pf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Joggo Maize Meal 1kg"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pf-desc">Description</Label>
            <Textarea
              id="pf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is it? weight, brand, key details"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="pf-shop">Source shop</Label>
              <Select value={shopId} onValueChange={setShopId}>
                <SelectTrigger id="pf-shop">
                  <SelectValue placeholder="Where you buy it" />
                </SelectTrigger>
                <SelectContent>
                  {shops.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pf-cat">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="pf-cat">
                  <SelectValue placeholder="Pick" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="pf-cost">Cost (KSh)</Label>
              <Input
                id="pf-cost"
                inputMode="decimal"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="150"
              />
              <p className="text-[10px] text-muted-foreground -mt-1">What you pay</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pf-price">Sell (KSh)</Label>
              <Input
                id="pf-price"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="180"
              />
              <p className="text-[10px] text-muted-foreground -mt-1">Customer pays</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pf-orig">Was (KSh)</Label>
              <Input
                id="pf-orig"
                inputMode="decimal"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="220"
              />
              <p className="text-[10px] text-muted-foreground -mt-1">For deals</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="pf-stock">Stock</Label>
              <Input
                id="pf-stock"
                inputMode="numeric"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="40"
              />
            </div>
          </div>

          {/* Image upload / URL */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Product image</Label>
              <div className="flex bg-muted rounded-md p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setImageMode("upload")}
                  className={`px-2 py-1 rounded flex items-center gap-1 ${
                    imageMode === "upload" ? "bg-card text-navy shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  <Upload className="w-3 h-3" /> Upload
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode("url")}
                  className={`px-2 py-1 rounded flex items-center gap-1 ${
                    imageMode === "url" ? "bg-card text-navy shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  <LinkIcon className="w-3 h-3" /> URL
                </button>
              </div>
            </div>
            {imageUrl ? (
              <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-border bg-gradient-to-br from-soft-orange to-orange-brand/15">
                <img src={imageUrl} alt="Product preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="absolute top-1.5 right-1.5 bg-navy/80 hover:bg-navy text-white rounded-md p-1"
                  aria-label="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : imageMode === "upload" ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full aspect-[4/3] rounded-lg border-2 border-dashed border-border hover:border-orange-brand/50 hover:bg-soft-orange/40 transition-colors flex flex-col items-center justify-center text-muted-foreground"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-orange-brand mb-2" />
                    <span className="text-xs">Uploading…</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 mb-2" />
                    <span className="text-xs">Click to upload</span>
                    <span className="text-[10px] mt-1">JPG, PNG, or WebP — max 5MB</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground text-xs py-3">
                <ImageIcon className="w-4 h-4" />
                Paste a public image URL below.
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            {imageMode === "url" && (
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…  (leave blank to use placeholder)"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="bg-orange-brand hover:bg-orange-brand/90"
            onClick={save}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : editing ? (
              "Save changes"
            ) : (
              "Add product"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
