"use client";

// OperatorRequests — list of custom (free-text) shopping requests from shoppers.
// Detail dialog shows the items text, contact shopper via WhatsApp, advance
// status (NEW -> CONTACTED -> SHOPPING -> DELIVERED), set a quoted total.
import { useEffect, useState } from "react";
import { ChevronRight, MessageCircle, MapPin, Phone, Clock, MessageSquareText, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  formatKES,
  formatDateShort,
  humanizeStatus,
  shortOrderId,
  whatsappLink,
} from "@/lib/format";

type CustomRequest = {
  id: string;
  shopperName: string;
  shopperPhone: string;
  itemsText: string;
  location: string;
  status: string;
  operatorNote: string | null;
  quotedTotal: number | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_STEPS = ["NEW", "CONTACTED", "SHOPPING", "DELIVERED"];

export function OperatorRequests() {
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [quotedTotalInput, setQuotedTotalInput] = useState("");
  const [noteInput, setNoteInput] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/operator/requests");
      const d = await r.json();
      setRequests(d.requests || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const openRequest = requests.find((r) => r.id === openId) || null;

  // When opening a request, sync local input fields with its current values.
  useEffect(() => {
    if (openRequest) {
      setQuotedTotalInput(openRequest.quotedTotal != null ? String(openRequest.quotedTotal) : "");
      setNoteInput(openRequest.operatorNote || "");
    }
  }, [openId, openRequest]);

  async function patch(update: { status?: string; quotedTotal?: number | null; operatorNote?: string | null }) {
    if (!openRequest) return;
    setAdvancing(true);
    try {
      const res = await fetch(`/api/operator/requests/${openRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error || "Could not update.");
        return;
      }
      toast.success(update.status ? `Marked as ${humanizeStatus(update.status)}` : "Saved");
      await load();
    } finally {
      setAdvancing(false);
    }
  }

  async function saveQuotedAndNote() {
    const q = quotedTotalInput.trim() === "" ? null : Number(quotedTotalInput);
    await patch({
      quotedTotal: q,
      operatorNote: noteInput.trim() || null,
    });
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      NEW: "bg-orange-brand text-white",
      CONTACTED: "bg-amber-brand text-white",
      SHOPPING: "bg-amber-brand text-white",
      DELIVERED: "bg-success text-white",
      CANCELLED: "bg-destructive text-white",
    };
    return <Badge className={map[status] || "bg-muted"}>{humanizeStatus(status)}</Badge>;
  }

  if (loading) {
    return (
      <Card className="p-4 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="py-12 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
          <MessageSquareText className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-navy">No quick orders yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          When shoppers can&rsquo;t find something in the catalog, they&rsquo;ll send a free-text
          shopping list here. Share the &ldquo;Quick order&rdquo; button with people around Kesses.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div>
          <h2 className="font-bold text-navy text-lg">Quick orders</h2>
          <p className="text-sm text-muted-foreground">
            Free-text shopping lists from shoppers. Contact them on WhatsApp to confirm
            availability + price, then shop + deliver.
          </p>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Shopper</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Quoted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-semibold text-navy">
                      #{shortOrderId(r.id)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-navy">{r.shopperName}</div>
                      <div className="text-xs text-muted-foreground">{r.shopperPhone}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {r.itemsText}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-navy">
                      {r.quotedTotal != null ? formatKES(r.quotedTotal) : "—"}
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateShort(r.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setOpenId(r.id)}
                        aria-label="View request"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Detail dialog */}
      <Dialog open={openId !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="text-navy">
              Quick order #{openRequest ? shortOrderId(openRequest.id) : ""}
            </DialogTitle>
            <DialogDescription>
              {openRequest ? formatDateShort(openRequest.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>

          {openRequest && (
            <div className="space-y-4">
              {/* Status + advance buttons */}
              <div className="bg-muted/40 rounded-lg p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Status: {statusBadge(openRequest.status)}
                </div>
                {openRequest.status !== "DELIVERED" && openRequest.status !== "CANCELLED" && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {nextSteps(openRequest.status).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        className="bg-orange-brand hover:bg-orange-brand/90"
                        disabled={advancing}
                        onClick={() => patch({ status: s })}
                      >
                        Mark as {humanizeStatus(s)}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/40 hover:bg-destructive/10"
                      disabled={advancing}
                      onClick={() => patch({ status: "CANCELLED" })}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {/* Items list (the free-text shopping list) */}
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Shopping list
                </div>
                <div className="bg-cream border border-border rounded-lg p-3 whitespace-pre-wrap text-sm text-navy font-medium">
                  {openRequest.itemsText}
                </div>
              </div>

              {/* Shopper + delivery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/40 rounded-lg p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Shopper
                  </div>
                  <div className="font-semibold text-navy">{openRequest.shopperName}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Phone className="w-3 h-3" /> {openRequest.shopperPhone}
                  </div>
                </div>
                <div className="bg-muted/40 rounded-lg p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Delivery
                  </div>
                  <div className="flex items-start gap-1 text-xs text-navy">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 text-orange-brand shrink-0" />
                    {openRequest.location}
                  </div>
                </div>
              </div>

              {/* Quoted total + operator note */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="rq-total">Quoted total (KSh)</Label>
                  <Input
                    id="rq-total"
                    inputMode="decimal"
                    value={quotedTotalInput}
                    onChange={(e) => setQuotedTotalInput(e.target.value)}
                    placeholder="e.g. 450"
                  />
                  <p className="text-[10px] text-muted-foreground -mt-1">
                    What you&rsquo;ll charge the shopper (after confirming items).
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rq-note">Your note</Label>
                  <Textarea
                    id="rq-note"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="e.g. called at 14:30, confirmed 2 bread"
                    rows={2}
                  />
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={saveQuotedAndNote}
                disabled={advancing}
              >
                Save quoted total + note
              </Button>

              <Separator />

              {/* WhatsApp the shopper */}
              <a
                href={whatsappLink(
                  openRequest.shopperPhone,
                  `Hello ${openRequest.shopperName}, about your HustleCart Kesses quick order #${shortRequestId(openRequest.id)} — you asked for: ${openRequest.itemsText.slice(0, 200)}. I can do it for KSh ${quotedTotalInput || "—"}.`
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="w-full text-success border-success/40 hover:bg-success/10">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat with shopper on WhatsApp
                </Button>
              </a>
              <p className="text-xs text-muted-foreground text-center -mt-2">
                Opens WhatsApp with a prefilled message including their list + your quoted total.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function nextSteps(current: string): string[] {
  const idx = STATUS_STEPS.indexOf(current);
  if (idx === -1 || idx === STATUS_STEPS.length - 1) return [];
  return [STATUS_STEPS[idx + 1]];
}

function shortRequestId(id: string): string {
  return id.slice(-6).toUpperCase();
}
