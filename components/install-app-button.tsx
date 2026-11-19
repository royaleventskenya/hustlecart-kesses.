"use client";

// InstallAppButton — triggers the PWA install prompt.
//
// On Android (Chrome) + desktop (Chrome/Edge), the browser fires a
// `beforeinstallprompt` event which we capture + store. Clicking this button
// calls `prompt()` on it, showing the native install dialog.
//
// On iOS (Safari), there's no `beforeinstallprompt` event — the user must
// manually use Share → "Add to Home Screen". So on iOS we show a modal with
// step-by-step instructions instead.
import { useEffect, useState } from "react";
import { Download, X, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOS || iPadOS;
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallAppButton({
  variant = "ghost",
  size = "sm",
  className = "",
  label = "Install app",
}: {
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "default";
  className?: string;
  label?: string;
}) {
  // The captured beforeinstallprompt event (null on iOS or if not yet fired).
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // Whether to show the iOS instructions modal.
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Wrap in microtask so we don't call setState synchronously inside the
    // effect body (satisfies react-hooks/set-state-in-effect).
    Promise.resolve().then(() => {
      setIsIOS(detectIOS());
      setIsStandalone(detectStandalone());
    });

    const handler = (e: Event) => {
      e.preventDefault();
      Promise.resolve().then(() => setDeferredPrompt(e as BeforeInstallPromptEvent));
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // If the app is already installed (running standalone), don't show the button.
  if (isStandalone) return null;

  async function handleClick() {
    if (deferredPrompt) {
      // Android / desktop: show the native install prompt.
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        toast.success("App installed!", {
          description: "Find it on your home screen.",
        });
      }
      // The prompt can only be used once; clear it.
      setDeferredPrompt(null);
    } else if (isIOS) {
      // iOS: no programmatic prompt — show instructions modal.
      setShowIOSModal(true);
    } else {
      // Browser doesn't support beforeinstallprompt (e.g. Firefox, Safari
      // desktop). Show a generic tip.
      toast.info("Install tip", {
        description:
          "Use your browser menu → 'Install app' or 'Add to Home Screen'.",
      });
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        className={className}
      >
        <Download className="w-4 h-4 mr-1.5" />
        {label}
      </Button>

      {/* iOS instructions modal */}
      <Dialog open={showIOSModal} onOpenChange={setShowIOSModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-navy text-center">
              Install on iPhone
            </DialogTitle>
            <DialogDescription className="text-center">
              HustleCart works as an app on your home screen. Here&rsquo;s how:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Step
              num={1}
              icon={<Share className="w-5 h-5 text-orange-brand" />}
              text="Tap the Share button at the bottom of Safari"
            />
            <Step
              num={2}
              icon={<Plus className="w-5 h-5 text-orange-brand" />}
              text='Choose "Add to Home Screen"'
            />
            <Step
              num={3}
              icon={<Download className="w-5 h-5 text-orange-brand" />}
              text="Tap Add — HustleCart will appear on your home screen"
            />
          </div>
          <Button
            className="w-full bg-orange-brand hover:bg-orange-brand/90"
            onClick={() => setShowIOSModal(false)}
          >
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Step({
  num,
  icon,
  text,
}: {
  num: number;
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-orange-brand/15 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 pt-1">
        <span className="text-xs font-bold text-orange-brand">Step {num}</span>
        <p className="text-sm text-navy">{text}</p>
      </div>
    </div>
  );
}
