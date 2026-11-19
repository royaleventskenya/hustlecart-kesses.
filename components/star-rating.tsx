"use client";

// StarRating — Amazon-style star rating.
// - display mode: shows filled/half/empty stars + optional review count
// - input mode: 5 clickable stars that highlight on hover
import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRatingDisplay({
  rating,
  count,
  size = "sm",
  className,
}: {
  rating: number; // 0..5
  count?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const px = size === "sm" ? 14 : size === "md" ? 18 : 22;
  const rounded = Math.round(rating * 2) / 2; // nearest 0.5

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center relative">
        {/* Background (empty) stars */}
        <div className="flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              width={px}
              height={px}
              className="text-muted-foreground/40"
              strokeWidth={1.5}
              fill="none"
            />
          ))}
        </div>
        {/* Foreground (filled) stars, clipped to rating width */}
        <div
          className="absolute top-0 left-0 flex overflow-hidden"
          style={{ width: `${(rounded / 5) * 100}%` }}
          aria-hidden
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              width={px}
              height={px}
              className="text-amber-brand shrink-0"
              strokeWidth={1.5}
              fill="currentColor"
            />
          ))}
        </div>
      </div>
      <span className="text-xs text-muted-foreground ml-1">
        {rating > 0 ? rating.toFixed(1) : "New"}
        {typeof count === "number" && count > 0 ? ` (${count})` : ""}
      </span>
    </div>
  );
}

export function StarRatingInput({
  value,
  onChange,
  size = "md",
  className,
}: {
  value: number; // 0..5
  onChange: (v: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [hover, setHover] = useState(0);
  const px = size === "sm" ? 22 : size === "md" ? 28 : 34;
  const shown = hover || value;

  return (
    <div className={cn("flex items-center gap-1", className)} onMouseLeave={() => setHover(0)}>
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        const filled = idx <= shown;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(idx)}
            onMouseEnter={() => setHover(idx)}
            className="p-0.5 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-brand/40 rounded"
            aria-label={`${idx} star${idx > 1 ? "s" : ""}`}
          >
            <Star
              width={px}
              height={px}
              className={filled ? "text-amber-brand" : "text-muted-foreground/40"}
              strokeWidth={1.5}
              fill={filled ? "currentColor" : "none"}
            />
          </button>
        );
      })}
      <span className="text-sm text-muted-foreground ml-2 min-w-[60px]">
        {shown > 0 ? labelFor(shown) : "Tap to rate"}
      </span>
    </div>
  );
}

function labelFor(n: number): string {
  switch (n) {
    case 1: return "Hated it";
    case 2: return "Disliked";
    case 3: return "It's OK";
    case 4: return "Liked it";
    case 5: return "Loved it";
    default: return "";
  }
}
