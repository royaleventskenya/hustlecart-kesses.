"use client";

// QuickOrderDialog — a free-text shopping list modal.
// For lazy shoppers who don't want to browse the catalog: they just type
// "niletee bread, milk 2L, sugar 1kg, soap" + their location, and the operator
// contacts them via WhatsApp to confirm availability + price.
import { useState } from "react";
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
import { Loader2, Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/use-app-store";

export function QuickOrderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const session = useAppStore((s) => s.session);
  const [name, setName] = useState(session?.name ?? "");
  const [phone, setPhone] = useState(session?.phone ?? "");
  const [items, setItems] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function reset() {
    setName(session?.name ?? "");
    setPhone(session?.phone ?? "");
    setItems("");
    setLocation("");
    setSuccess(false);
  }

  function handleClose(o: boolean) {
    onOpenChange(o);
    if (!o) setTimeout(reset, 200);
  }

  async function submit() {
    if (name.trim().length < 2) {
      toast.error("Enter your name.");
      return;
    }
    if (phone.trim().length < 6) {
      toast.error("Enter your phone number.");
      return;
    }
    if (items.trim().length < 3) {
      toast.error("Tell us what you want us to shop for you.");
      return;
    }
    if (location.trim().length < 3) {
      toast.error("Tell us where to deliver.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          items: items.trim(),
          location: location.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not submit.");
        setSubmitting(false);
        return;
      }
      setSuccess(true);
      toast.success("Request sent!", {
        description: "HustleCart will WhatsApp you to confirm.",
      });
    } catch (e) {
      console.error(e);
      toast.error("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-navy">
            {success ? "Request received!" : "Quick order"}
          </DialogTitle>
          <DialogDescription>
            {success
              ? "We got your shopping list."
              : "Can't find it in the catalog? Just tell us what you want — we'll shop for you."}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-4 space-y-4 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/15 flex items-center justify-center">
              <MessageSquare className="w-9 h-9 text-success" />
            </div>
            <div>
              <div className="font-semibold text-navy">We&rsquo;ll be in touch</div>
              <p className="text-sm text-muted-foreground mt-1">
                HustleCart will WhatsApp you on{" "}
                <span className="font-semibold text-navy">{phone}</span> to confirm
                what&rsquo;s available and the total price. Then we shop + deliver.
              </p>
            </div>
            <Button
              className="w-full bg-orange-brand hover:bg-orange-brand/90"
              onClick={() => handleClose(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="qo-items" className="mb-1.5 block">
                What do you want us to shop for you?
              </Label>
              <Textarea
                id="qo-items"
                value={items}
                onChange={(e) => setItems(e.target.value)}
                placeholder={"e.g.\n- 2 bread ya Supaloaf\n- milk 1L\n- sugar 1kg\n- cooking oil 1L\n- soap ya Geisha"}
                rows={5}
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                Write anything — we&rsquo;ll figure out where to get it.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="qo-name">Your name</Label>
                <Input
                  id="qo-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Kamau"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="qo-phone">Phone (WhatsApp)</Label>
                <Input
                  id="qo-phone"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XX XXX XXX"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="qo-loc">Delivery location</Label>
              <Textarea
                id="qo-loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Near Kesses Market, behind Equity Bank"
                rows={2}
              />
            </div>
          </div>
        )}

        {!success && (
          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="bg-orange-brand hover:bg-orange-brand/90"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" /> Send request
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
