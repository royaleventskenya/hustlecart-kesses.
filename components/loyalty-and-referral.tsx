"use client";

// LoyaltyCard + ReferralSection — shown in the shopper's account menu or as
// a section on the storefront. Combines:
//   1. Visual stamp card (10 slots, filled with orange stamps)
//   2. Redeem button (when 10 stamps collected → free delivery credit)
//   3. Referral code + share link + referral count
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Award, Share2, Users, Gift, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAppStore } from "@/store/use-app-store";
import { shareApp } from "@/lib/share";

type LoyaltyData = {
  stamps: number;
  freeDelivery: number;
  stampsNeeded: number;
  canRedeem: boolean;
};
type ReferralData = {
  referralCode: string;
  referredCount: number;
  bonusStamps: number;
  shareLink: string;
};

export function LoyaltyAndReferral() {
  const session = useAppStore((s) => s.session);
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/loyalty").then((r) => r.json()),
      fetch("/api/referral").then((r) => r.json()),
    ])
      .then(([l, r]) => {
        setLoyalty(l);
        setReferral(r);
      })
      .finally(() => setLoading(false));
  }, []);

  async function redeem() {
    setRedeeming(true);
    try {
      const res = await fetch("/api/loyalty", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not redeem.");
        return;
      }
      setLoyalty({
        stamps: data.stamps,
        freeDelivery: data.freeDelivery,
        stampsNeeded: Math.max(0, 10 - data.stamps % 10),
        canRedeem: data.stamps >= 10,
      });
      toast.success("Free delivery redeemed!", {
        description: "Your next order's delivery is on us.",
      });
    } finally {
      setRedeeming(false);
    }
  }

  async function shareReferral() {
    if (!referral) return;
    const url = typeof window !== "undefined" ? window.location.origin : "";
    const fullLink = `${url}${referral.shareLink}`;
    const text = `Shop with HustleCart Kesses — your personal shopper for Kesses. Use my code and we both get bonus stamps!`;

    // Try Web Share API first
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "HustleCart Kesses", text, url: fullLink });
        return;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }

    // Fallback: copy to clipboard
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${text} ${fullLink}`);
        setCopied(true);
        toast.success("Referral link copied!", {
          description: "Share it with friends — you both get bonus stamps.",
        });
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.info("Share this link", { description: fullLink });
      }
    }
  }

  if (loading || !loyalty || !referral) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-20 bg-muted/40 rounded-lg" />
      </Card>
    );
  }

  const filledSlots = loyalty.stamps % 10 || (loyalty.stamps > 0 && loyalty.stamps % 10 === 0 ? 10 : 0);

  return (
    <div className="space-y-4">
      {/* Loyalty stamp card */}
      <Card className="p-4 bg-gradient-to-br from-orange-brand/10 to-soft-orange/40 border-orange-brand/20">
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-5 h-5 text-orange-brand" />
          <h3 className="font-bold text-navy">Loyalty card</h3>
          {loyalty.freeDelivery > 0 && (
            <Badge className="bg-success text-white">
              <Gift className="w-3 h-3 mr-1" />
              {loyalty.freeDelivery} free delivery
            </Badge>
          )}
        </div>

        {/* Visual stamp card — 10 slots */}
        <div className="grid grid-cols-5 gap-2 mb-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05, type: "spring" }}
              className={`aspect-square rounded-full flex items-center justify-center border-2 ${
                i < filledSlots
                  ? "bg-orange-brand border-orange-brand text-white"
                  : "bg-card border-border"
              }`}
            >
              {i < filledSlots ? (
                <Check className="w-4 h-4" />
              ) : (
                <span className="text-xs text-muted-foreground">{i + 1}</span>
              )}
            </motion.div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-bold text-navy">{loyalty.stamps}</span>
            <span className="text-muted-foreground"> stamps total</span>
            {!loyalty.canRedeem && (
              <span className="text-muted-foreground">
                {" "}· {loyalty.stampsNeeded} more for free delivery
              </span>
            )}
          </div>
          {loyalty.canRedeem && (
            <Button
              size="sm"
              className="bg-success hover:bg-success/90 text-white"
              onClick={redeem}
              disabled={redeeming}
            >
              <Gift className="w-3.5 h-3.5 mr-1" />
              {redeeming ? "Redeeming…" : "Redeem free delivery"}
            </Button>
          )}
        </div>
      </Card>

      {/* Referral section */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-orange-brand" />
          <h3 className="font-bold text-navy">Refer & earn</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Share your link with friends. When they place their first order, you both get a bonus stamp!
        </p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">Your code</div>
            <div className="font-mono font-bold text-navy truncate">
              {referral.referralCode.slice(0, 8).toUpperCase()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Referred</div>
            <div className="font-bold text-orange-brand">{referral.referredCount}</div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={shareReferral}
            className="text-orange-brand border-orange-brand/40 hover:bg-orange-brand/10"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1" /> Copied!
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 mr-1" /> Share
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
