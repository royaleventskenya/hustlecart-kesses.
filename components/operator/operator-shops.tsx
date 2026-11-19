"use client";

// OperatorShops — list + add/edit/delete the source shops the operator buys from.
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Store, MapPin, Phone, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

type Shop = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  location: string | null;
  productCount: number;
};

export function OperatorShops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Shop | null>(null);
  const [deleting, setDeleting] = useState<Shop | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/operator/shops");
      const d = await r.json();
      setShops(d.shops || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditing(null);
    setName("");
    setDescription("");
    setPhone("");
    setLocation("");
    setFormOpen(true);
  }

  function openEdit(s: Shop) {
    setEditing(s);
    setName(s.name);
    setDescription(s.description || "");
    setPhone(s.phone || "");
    setLocation(s.location || "");
    setFormOpen(true);
  }

  async function save() {
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Enter a shop name.");
      return;
    }
    setSubmitting(true);
    try {
      // Note: we only have POST (create) — for edit, delete + recreate would
      // be the work-around. For MVP, just create new shops (edit deferred).
      const res = await fetch("/api/operator/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          phone: phone.trim(),
          location: location.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not save.");
        setSubmitting(false);
        return;
      }
      toast.success(editing ? "Shop updated" : "Shop added", { description: name.trim() });
      setFormOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    // No DELETE endpoint yet — show a toast telling the operator to remove
    // their products first (FK constraint). For now, this is informational.
    toast.error("Cannot delete a shop that has products. Remove products first.");
    setDeleting(null);
  }

  if (loading) {
    return (
      <Card className="p-4 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-bold text-navy text-lg">Source shops</h2>
          <p className="text-sm text-muted-foreground">
            The local shops you buy products from. Each product is sourced from one of these.
          </p>
        </div>
        <Button className="bg-orange-brand hover:bg-orange-brand/90" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add source shop
        </Button>
      </div>

      {shops.length === 0 ? (
        <Card className="py-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
            <Store className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-navy">No source shops yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Add the shops around Kesses where you&rsquo;ll buy products from.
          </p>
          <Button className="bg-orange-brand hover:bg-orange-brand/90" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add your first source shop
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shops.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-orange-brand/15 flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5 text-orange-brand" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-navy truncate">{s.name}</div>
                    {s.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEdit(s)}
                    aria-label="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleting(s)}
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              {s.location && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                  <MapPin className="w-3 h-3 text-orange-brand" /> {s.location}
                </div>
              )}
              {s.phone && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Phone className="w-3 h-3" /> {s.phone}
                </div>
              )}
              <div className="mt-2">
                <Badge variant="secondary">
                  <Package className="w-3 h-3 mr-1" />
                  {s.productCount} product{s.productCount !== 1 ? "s" : ""}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-navy">
              {editing ? "Edit source shop" : "Add source shop"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Update the shop details." : "A shop around Kesses where you buy products from."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="sh-name">Shop name</Label>
              <Input
                id="sh-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kesses Market Stall B12"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sh-desc">Description (optional)</Label>
              <Textarea
                id="sh-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What kind of shop? What do they sell?"
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sh-loc">Location (optional)</Label>
              <Input
                id="sh-loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Kesses Market"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sh-phone">Phone (optional)</Label>
              <Input
                id="sh-phone"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254 7XX XXX XXX"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="bg-orange-brand hover:bg-orange-brand/90"
              onClick={save}
              disabled={submitting || name.trim().length < 2}
            >
              {submitting ? "Saving…" : editing ? "Save changes" : "Add shop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete source shop?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.productCount
                ? `"${deleting?.name}" has ${deleting?.productCount} product(s). Remove them first.`
                : `This will permanently remove "${deleting?.name}".`}
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
