// HustleCart Kesses service worker.
// Caches the app shell so it loads instantly on repeat visits (even offline).
// API requests are always network-first (so fresh data wins); only the static
// shell (HTML, JS, CSS, fonts, images) is served from cache when offline.
const CACHE_VERSION = "hustlecart-v1";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const IMG_CACHE = `${CACHE_VERSION}-img`;

// Assets to pre-cache on install (the app shell).
const SHELL_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/favicon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // Don't let a single failed asset abort the whole install.
      Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET. POST/PUT/etc. always go to network.
  if (req.method !== "GET") return;

  // Never intercept WebSocket upgrades.
  if (req.headers.get("upgrade") === "websocket") return;

  // API requests: network-first. If the network fails, try cache (stale data
  // is better than nothing for a shopper checking their order status offline).
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Cache successful GET responses so they're available offline.
          if (res.ok) {
            const clone = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || new Response("Offline", { status: 503 })))
    );
    return;
  }

  // Product images (uploaded to /uploads/products/): cache-first, fall back to
  // network if not cached. This makes product images load instantly on repeat
  // visits even when offline.
  if (url.pathname.startsWith("/uploads/")) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(IMG_CACHE).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        }).catch(() => cached || new Response("", { status: 503 }));
      })
    );
    return;
  }

  // Same-origin navigation requests (HTML pages): network-first with cache
  // fallback. If offline, serve the cached "/" shell so the app still loads.
  if (req.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, clone)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match("/"))
        )
    );
    return;
  }

  // Other same-origin static assets (JS/CSS/fonts): stale-while-revalidate.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(SHELL_CACHE).then((c) => c.put(req, clone)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
