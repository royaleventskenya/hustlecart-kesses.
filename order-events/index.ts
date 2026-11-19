// HustleCart Kesses — order-events WebSocket mini-service.
//
// Two HTTP servers in the same process:
//   - Port 3003: socket.io (path "/"), used by browser clients via Caddy:
//       io("/?XTransformPort=3003", { transports: ["websocket", "polling"] })
//   - Port 3004: internal HTTP endpoint for the Next.js API to emit events.
//       POST http://localhost:3004/_emit  { orderId, event?, payload }
//       Auth: X-Hustlecart-Token: <HUSTLECART_INTERNAL_TOKEN>
//
// We need two ports because socket.io with path="/" intercepts ALL requests
// on its port (every URL starts with "/"), so we can't also serve plain HTTP
// endpoints there. The internal port is local-only — it does NOT go through
// Caddy and is not exposed externally.
import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { Server } from "socket.io";

const SOCKET_PORT = 3003;
const INTERNAL_PORT = 3004;
const INTERNAL_TOKEN = process.env.HUSTLECART_INTERNAL_TOKEN || "dev-only-shared-secret";

// ─── Socket.io server (port 3003) ─────────────────────────────────────────────
const ioServer = createServer();
const io = new Server(ioServer, {
  // DO NOT change the path — Caddy forwards "/" with the XTransformPort query
  // to this service. socket.io attaches to the same HTTP server.
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.on("connection", (socket) => {
  console.log(`[order-events] client connected: ${socket.id}`);

  // Client sends: { orderId } -> joins room "order:<orderId>"
  socket.on("subscribe:order", (data: { orderId?: string }) => {
    if (!data?.orderId || typeof data.orderId !== "string") return;
    const room = `order:${data.orderId}`;
    socket.join(room);
    socket.emit("subscribed:order", { orderId: data.orderId, room });
    console.log(`[order-events] ${socket.id} joined ${room}`);
  });

  socket.on("unsubscribe:order", (data: { orderId?: string }) => {
    if (!data?.orderId) return;
    socket.leave(`order:${data.orderId}`);
    socket.emit("unsubscribed:order", { orderId: data.orderId });
  });

  // Operator subscribes to a global "operator" room to receive new-order /
  // new-request notifications (broadcast, not per-order).
  socket.on("subscribe:operator", () => {
    socket.join("operator");
    socket.emit("subscribed:operator", { room: "operator" });
    console.log(`[order-events] ${socket.id} joined operator room`);
  });

  socket.on("disconnect", (reason) => {
    console.log(`[order-events] disconnected ${socket.id}: ${reason}`);
  });

  socket.on("error", (err) => {
    console.error(`[order-events] socket error ${socket.id}:`, err);
  });
});

ioServer.listen(SOCKET_PORT, () => {
  console.log(`[order-events] socket.io listening on port ${SOCKET_PORT}`);
});

// ─── Internal HTTP emit endpoint (port 3004) ──────────────────────────────────
const internalServer = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Hustlecart-Token");

  if ((req.method || "").toUpperCase() === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url || "";

  if (url === "/_health" && (req.method || "").toUpperCase() === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        socketPort: SOCKET_PORT,
        internalPort: INTERNAL_PORT,
        connections: io.engine.clientsCount,
      })
    );
    return;
  }

  if (url === "/_emit" && (req.method || "").toUpperCase() === "POST") {
    const provided = req.headers["x-hustlecart-token"];
    const token = Array.isArray(provided) ? provided[0] : provided;
    if (token !== INTERNAL_TOKEN) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body || "{}");
        const { orderId, event = "order:status", payload, room } = parsed;
        // Target room resolution:
        //   1. If `room` is provided explicitly (e.g. "operator"), use it.
        //   2. Else if `orderId` is provided, target `order:<orderId>`.
        //   3. Else error.
        let targetRoom: string;
        if (typeof room === "string" && room.length > 0) {
          targetRoom = room;
        } else if (orderId && typeof orderId === "string") {
          targetRoom = `order:${orderId}`;
        } else {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing orderId or room" }));
          return;
        }
        io.to(targetRoom).emit(event, {
          ...(orderId ? { orderId } : {}),
          ...payload,
          emittedAt: new Date().toISOString(),
        });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, room: targetRoom, event }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

internalServer.listen(INTERNAL_PORT, () => {
  console.log(`[order-events] internal emit endpoint on port ${INTERNAL_PORT} (POST /_emit)`);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
function shutdown() {
  console.log("[order-events] shutting down...");
  io.close();
  ioServer.close();
  internalServer.close(() => process.exit(0));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
