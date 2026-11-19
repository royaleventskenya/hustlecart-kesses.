"use client";

// ReviewList — Amazon-style reviews section: summary stats + distribution bars
// + individual reviews. Stats are derived from the local reviews state so they
// stay correct after a review is submitted or updated in-place.
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StarRatingDisplay } from "@/components/star-rating";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { ReviewForm, type SavedReview } from "./review-form";
import { formatDateShort } from "@/lib/format";

export type Review = SavedReview;

export function ReviewList({
  productId,
  reviews: initial,
}: {
  productId: string;
  reviews: Review[];
  // The initial count/average/distribution are accepted for the first render
  // but ignored afterward — we derive everything from the local reviews state
  // so the summary updates immediately when a new review is submitted.
  count?: number;
  average?: number;
  distribution?: { star: number; count: number }[];
}) {
  const [reviews, setReviews] = useState<Review[]>(initial);
  const [showForm, setShowForm] = useState(false);

  // Derive count, average, and distribution from local state.
  const { count: liveCount, average: liveAvg, distribution: liveDist } = useMemo(() => {
    const c = reviews.length;
    const avg = c > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / c : 0;
    const dist = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter((r) => r.rating === star).length,
    }));
    return { count: c, average: avg, distribution: dist };
  }, [reviews]);

  function handleSubmitted(r: Review) {
    // Prepend the new/updated review, removing any older one by same user name.
    const filtered = reviews.filter((x) => x.user.name !== r.user.name);
    setReviews([r, ...filtered]);
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-navy text-lg">Customer reviews</h3>

      {/* Summary */}
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Left: average + distribution */}
        <div className="sm:w-56 shrink-0">
          <div className="flex items-center gap-2">
            <StarRatingDisplay rating={liveAvg} size="md" />
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {liveCount} global rating{liveCount !== 1 ? "s" : ""}
          </div>
          <div className="mt-3 space-y-1">
            {liveDist.map((d) => {
              const pct = liveCount > 0 ? (d.count / liveCount) * 100 : 0;
              return (
                <div key={d.star} className="flex items-center gap-2 text-xs">
                  <span className="w-12 text-muted-foreground">{d.star} star</span>
                  <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-amber-brand"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-muted-foreground">{d.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: write a review CTA */}
        <div className="flex-1 border-l-0 sm:border-l border-border sm:pl-6">
          {!showForm ? (
            <Button
              variant="outline"
              onClick={() => setShowForm(true)}
              className="bg-amber-brand hover:bg-amber-brand/90 text-navy border-0 font-semibold"
            >
              Write a customer review
            </Button>
          ) : (
            <ReviewForm productId={productId} onSubmitted={handleSubmitted} />
          )}
        </div>
      </div>

      <Separator />

      {/* Individual reviews */}
      {reviews.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No reviews yet. Be the first to review this product.
        </div>
      ) : (
        <div className="space-y-5">
          {reviews.map((r) => (
            <div key={r.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-orange-brand text-white text-xs font-bold flex items-center justify-center">
                  {r.user.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-sm text-navy">{r.user.name}</span>
              </div>
              <StarRatingDisplay rating={r.rating} size="sm" />
              {r.title && <div className="font-bold text-sm text-navy mt-1">{r.title}</div>}
              {r.comment && (
                <p className="text-sm text-foreground leading-relaxed mt-0.5">{r.comment}</p>
              )}
              <div className="text-xs text-muted-foreground">
                Reviewed on {formatDateShort(r.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
