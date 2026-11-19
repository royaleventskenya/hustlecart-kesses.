// Share utility — used by ShareAppButton + the header dropdown menu item.
// Uses the Web Share API (navigator.share()) when available (most mobile
// browsers + some desktop). Falls back to copying the link to clipboard.

export const SHARE_TITLE = "HustleCart Kesses";
export const SHARE_TEXT =
  "Shop with HustleCart Kesses — your personal shopper for Kesses. Browse the catalog or send a quick order, and we'll buy from local shops and deliver to your door. Cash on delivery.";

export async function shareApp(): Promise<void> {
  if (typeof window === "undefined") return;
  const url = window.location.origin;
  const shareData = { title: SHARE_TITLE, text: SHARE_TEXT, url };

  // Try the Web Share API first (mobile + supported desktop browsers).
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(shareData);
      return;
    } catch (e) {
      // User cancelled — don't fall through to clipboard.
      if (e instanceof Error && e.name === "AbortError") return;
      // Other errors: fall through to clipboard copy.
    }
  }

  // Fallback: copy the link to clipboard.
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(`${SHARE_TEXT} ${url}`);
      // Import toast lazily so this util can be used from both client + server
      // contexts without pulling sonner into the server bundle.
      const { toast } = await import("sonner");
      toast.success("Link copied!", {
        description: "Paste it anywhere to share HustleCart Kesses.",
      });
      return;
    } catch {
      // Last resort below.
    }
  }

  // Absolute last resort: show the URL in a toast.
  const { toast } = await import("sonner");
  toast.info("Share this link", { description: url });
}
