"use client";

// ReviewForm — submit a 1-5 star review with optional title + comment.
// Only shown when the user is logged in as a shopper.
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRatingInput } from "@/components/star-rating";
import { toast } from "sonner";
import { useAppStore } from "@/store/use-app-store";

export type SavedReview = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: string;
  user: { name: string };
};

export function ReviewForm({
  productId,
  onSubmitted,
}: {
  productId: string;
  onSubmitted: (r: SavedReview) => void;
}) {
  const session = useAppStore((s) => s.session);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!session) {
    return (
      <div className="bg-muted/40 rounded-lg p-4 text-center text-sm text-muted-foreground">
        Log in to leave a review.
      </div>
    );
  }

  async function submit() {
    if (rating < 1 || rating > 5) {
      toast.error("Pick a star rating.");
      return;
    }
    if (!title.trim() && !comment.trim()) {
      toast.error("Add a title or comment.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating,
          title: title.trim() || undefined,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not submit review.");
        return;
      }
      toast.success("Review submitted!");
      onSubmitted(data.review);
      setRating(0);
      setTitle("");
      setComment("");
    } catch (e) {
      console.error(e);
      toast.error("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <h4 className="font-bold text-navy">Write a review</h4>
      <div>
        <Label className="block mb-1.5">Your rating</Label>
        <StarRatingInput value={rating} onChange={setRating} size="md" />
      </div>
      <div>
        <Label htmlFor="rv-title" className="block mb-1.5">
          Title (optional)
        </Label>
        <Input
          id="rv-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sum up your experience"
          maxLength={120}
        />
      </div>
      <div>
        <Label htmlFor="rv-comment" className="block mb-1.5">
          Comment (optional)
        </Label>
        <Textarea
          id="rv-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What did you like? What could be better?"
          rows={3}
          maxLength={2000}
        />
      </div>
      <Button
        onClick={submit}
        disabled={submitting || rating < 1}
        className="bg-orange-brand hover:bg-orange-brand/90"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…
          </>
        ) : (
          "Submit review"
        )}
      </Button>
    </div>
  );
}
