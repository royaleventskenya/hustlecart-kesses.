"use client";

// OperatorDeliveryZones — manage delivery areas + their fees.
// e.g. "Kesses Market" KSh 50, "Cheptiret" KSh 120, "Tulwet" KSh 100.
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, MapPin, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import { formatKES } from "@/lib/format";

type Zone = {
  id: string;
  name: string;
  description: string | null;
  fee: number;
  active: boolean;
  createdAt: string;
};

export function OperatorDeliveryZones() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [deleting, setDeleting] = useState<Zone | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fee, setFee] = useState("");
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/operator/delivery-zones");
      const d = await r.json();
      setZones(d.zones || []);
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
    setFee("80");
    setActive(true);
    setFormOpen(true);
  }

  function openEdit(z: Zone) {
    setEditing(z);
    setName(z.name);
    setDescription(z.description || "");
    setFee(String(z.fee));
    setActive(z.active);
    setFormOpen(true);
  }

  async function save() {
    if (name.trim().length < 2) {
      toast.error("Enter a zone name.");
      return;
    }
    const feeNum = Number(fee);
    if (!Number.isFinite(feeNum) || feeNum < 0) {
      toast.error("Enter a valid delivery fee.");
      return;
    }
    setSubmitting(true);
    try {
      const url = editing
        ? `/api/operator/delivery-zones/${editing.id}`
        : "/api/operator/delivery-zones";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          fee: feeNum,
          active,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not save.");
        setSubmitting(false);
        return;
      }
      toast.success(editing ? "Zone updated" : "Zone added", { description: name.trim() });
      setFormOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(z: Zone) {
    const res = await fetch(`/api/operator/delivery-zones/${z.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !z.active }),
    });
    if (res.ok) {
      toast.success(`${z.name} ${!z.active ? "activated" : "deactivated"}`);
      await load();
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/operator/delivery-zones/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not delete.");
        return;
      }
      toast.success("Zone deleted", { description: deleting.name });
      await load();
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <Card className="p-4 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-bold text-navy text-lg">Delivery zones</h2>
          <p className="text-sm text-muted-foreground">
            Set different delivery fees for different areas. Shoppers pick their zone at checkout.
          </p>
        </div>
        <Button className="bg-orange-brand hover:bg-orange-brand/90" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> Add zone
        </Button>
      </div>

      {zones.length === 0 ? (
        <Card className="py-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
            <MapPin className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-navy">No delivery zones yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Add areas you deliver to (e.g. Kesses Market KSh 50, Cheptiret KSh 120).
            Shoppers will pick their zone at checkout and the fee is auto-applied.
          </p>
          <Button className="bg-orange-brand hover:bg-orange-brand/90" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1.5" /> Add your first zone
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {zones.map((z) => (
            <Card key={z.id} className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-brand/15 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-orange-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-navy">{z.name}</span>
                  <Badge className="bg-orange-brand text-white">
                    {formatKES(z.fee)}
                  </Badge>
                  {!z.active && <Badge variant="secondary">Inactive</Badge>}
                </div>
                {z.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{z.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1">
                  <Switch checked={z.active} onCheckedChange={() => toggleActive(z)} />
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(z)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleting(z)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
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
              {editing ? "Edit delivery zone" : "Add delivery zone"}
            </DialogTitle>
            <DialogDescription>
              An area you deliver to + the fee for that area.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="z-name">Zone name</Label>
              <Input
                id="z-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cheptiret Centre"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="z-desc">Description (optional)</Label>
              <Input
                id="z-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Areas around Cheptiret market"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="z-fee">Delivery fee (KSh)</Label>
              <Input
                id="z-fee"
                inputMode="decimal"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="120"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="z-active">Active (shown at checkout)</Label>
              <Switch id="z-active" checked={active} onCheckedChange={setActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="bg-orange-brand hover:bg-orange-brand/90"
              onClick={save}
              disabled={submitting}
            >
              {submitting ? "Saving…" : editing ? "Save changes" : "Add zone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete delivery zone?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &ldquo;{deleting?.name}&rdquo;. Shoppers won&rsquo;t be able to select it at checkout.
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
