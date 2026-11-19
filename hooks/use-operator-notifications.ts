"use client";

// useOperatorNotifications — subscribes to the operator WebSocket room and
// fires a sound + browser notification + toast whenever a new order or
// quick request arrives. Also tracks the notification permission state.
//
// Call this hook once from the operator dashboard.
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { useAppStore } from "@/store/use-app-store";

type Permission = "default" | "granted" | "denied" | "unsupported";

// A short notification chime generated on-the-fly via the Web Audio API —
// no asset file needed. Plays a pleasant two-note ascending tone.
function playChime() {
  try {
    const AudioCtx =
      typeof window !== "undefined"
        ? window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    // Two-note chime: C5 (523.25Hz) then E5 (659.25Hz)
    const notes = [
      { freq: 523.25, start: 0, dur: 0.15 },
      { freq: 659.25, start: 0.12, dur: 0.2 },
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(0, now + n.start);
      gain.gain.linearRampToValueAtTime(0.3, now + n.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.start);
      osc.stop(now + n.start + n.dur + 0.05);
    }
    // Close the context after the chime finishes to free resources.
    setTimeout(() => ctx.close(), 600);
  } catch {
    // Audio might be blocked until user interaction — ignore silently.
  }
}

export function useOperatorNotifications() {
  const session = useAppStore((s) => s.session);
  const setView = useAppStore((s) => s.setView);
  const [permission, setPermission] = useState<Permission>("default");
  // Track seen event IDs so we don't double-fire on reconnect.
  const seen = useRef<Set<string>>(new Set());

  // Detect support + current permission on mount. Wrap in microtask so we
  // don't call setState synchronously inside the effect body.
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      Promise.resolve().then(() => setPermission("unsupported"));
      return;
    }
    Promise.resolve().then(() => setPermission(Notification.permission as Permission));
  }, []);

  // Only run the socket subscription for the operator.
  const isOperator = session?.role === "operator";

  useEffect(() => {
    if (!isOperator) return;

    const socket: Socket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      timeout: 8000,
    });

    socket.on("connect", () => {
      socket.emit("subscribe:operator");
    });

    socket.on("order:new", (payload: {
      orderId: string;
      customerName: string;
      total: number;
      itemCount: number;
      scheduledFor?: string | null;
      emittedAt: string;
    }) => {
      const key = `order:${payload.orderId}:${payload.emittedAt}`;
      if (seen.current.has(key)) return;
      seen.current.add(key);
      // Keep the seen set from growing unboundedly.
      if (seen.current.size > 100) {
        seen.current = new Set(Array.from(seen.current).slice(-50));
      }

      playChime();

      const total = payload.total;
      const scheduledNote = payload.scheduledFor
        ? ` · scheduled for ${new Date(payload.scheduledFor).toLocaleString("en-KE", { weekday: "short", hour: "2-digit", minute: "2-digit" })}`
        : "";
      toast.success(`New order from ${payload.customerName}`, {
        description: `${payload.itemCount} item(s) · KSh ${total.toLocaleString("en-KE")}${scheduledNote}`,
        duration: 8000,
        action: {
          label: "View",
          onClick: () => setView("operator"),
        },
      });

      if (permission === "granted" && typeof Notification !== "undefined") {
        try {
          const n = new Notification("New order on HustleCart Kesses", {
            body: `${payload.customerName} · ${payload.itemCount} item(s) · KSh ${total.toLocaleString("en-KE")}`,
            tag: payload.orderId,
            // icon: "/icon-192.png",  // (would need the PWA icon)
          });
          n.onclick = () => {
            window.focus();
            setView("operator");
            n.close();
          };
        } catch {
          // Notification might fail if the page isn't focused; ignore.
        }
      }
    });

    socket.on("request:new", (payload: {
      requestId: string;
      shopperName: string;
      itemsText: string;
      emittedAt: string;
    }) => {
      const key = `request:${payload.requestId}:${payload.emittedAt}`;
      if (seen.current.has(key)) return;
      seen.current.add(key);
      if (seen.current.size > 100) {
        seen.current = new Set(Array.from(seen.current).slice(-50));
      }

      playChime();

      const preview = payload.itemsText.slice(0, 80);
      toast.success(`Quick order from ${payload.shopperName}`, {
        description: preview + (payload.itemsText.length > 80 ? "…" : ""),
        duration: 8000,
        action: {
          label: "View",
          onClick: () => setView("operator"),
        },
      });

      if (permission === "granted" && typeof Notification !== "undefined") {
        try {
          const n = new Notification("Quick order on HustleCart Kesses", {
            body: `${payload.shopperName}: ${preview}${payload.itemsText.length > 80 ? "…" : ""}`,
            tag: payload.requestId,
          });
          n.onclick = () => {
            window.focus();
            setView("operator");
            n.close();
          };
        } catch {
          // ignore
        }
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [isOperator, permission, setView]);

  // Helper: request notification permission (called from a user gesture, e.g.
  // a "Enable notifications" button — browsers block programmatic requests
  // without a user interaction).
  async function enableNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result as Permission);
      if (result === "granted") {
        toast.success("Notifications on", {
          description: "You'll get a chime + notification for every new order.",
        });
        // Play the chime once so the operator knows what it sounds like.
        playChime();
      } else if (result === "denied") {
        toast.error("Notifications blocked", {
          description: "Enable them in your browser settings to get order alerts.",
        });
      }
    } catch {
      setPermission("unsupported");
    }
  }

  return { permission, enableNotifications };
}
