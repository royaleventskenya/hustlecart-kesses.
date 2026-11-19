"use client";

// Registers the service worker on the client so the app is installable as a
// PWA + loads instantly on repeat visits (offline shell caching).
//
// Registration rules:
//   - Always register in production (NODE_ENV=production).
//   - In dev, register when the host is NOT localhost (so it works on preview
//     domains like preview-xxx.space-z.ai but doesn't cache files during
//     local development on localhost:3000).
//   - Can be forced with ?sw=1 in the URL.
import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "[::1]";
    const isProd = process.env.NODE_ENV === "production";
    const forced = window.location.search.includes("sw=1");

    // Register in prod, on non-localhost hosts, or when forced with ?sw=1.
    if (!isProd && isLocalhost && !forced) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        // Listen for updates + auto-activate the new SW when it arrives.
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              // New version installed — reload once so the user gets the latest.
              window.location.reload();
            }
          });
        });
      } catch (e) {
        // SW registration is a nice-to-have; fail silently.
        console.warn("[sw] registration failed:", e);
      }
    };
    register();
  }, []);
  return null;
}
