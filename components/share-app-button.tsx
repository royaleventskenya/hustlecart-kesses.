"use client";

// ShareAppButton — shares the app link with others.
// Uses the Web Share API (navigator.share()) when available (most mobile
// browsers + some desktop). Falls back to copying the link to clipboard.
import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shareApp } from "@/lib/share";

export function ShareAppButton({
  variant = "ghost",
  size = "sm",
  className = "",
  label = "Share",
}: {
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "default";
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    await shareApp();
    // Show a brief "Copied!" state if the clipboard was used (heuristic:
    // if navigator.share wasn't available, the util copied to clipboard).
    if (typeof navigator !== "undefined" && typeof navigator.share !== "function") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={className}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 mr-1.5" /> Copied!
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4 mr-1.5" /> {label}
        </>
      )}
    </Button>
  );
}
