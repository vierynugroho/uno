/**
 * Standalone Socket.IO server for the UNO No Mercy real-time backend.
 *
 * Next.js on Vercel runs as serverless functions with no long-lived process
 * and no shared in-memory state, so it can't host the WebSocket layer used
 * by this game. Deploy the Next.js app to Vercel for the UI, and deploy this
 * file separately to any host that runs a persistent Node process (Render,
 * Railway, Fly.io, a VPS, ...). Point the Vercel app at it via the
 * NEXT_PUBLIC_SOCKET_URL env var (see src/lib/socket/client/socketClient.ts).
 *
 * Local development doesn't use this file — `npm run dev` runs server.ts,
 * which serves the Next.js app and the socket layer together on one port.
 */
import { createServer } from "node:http";
import { Server } from "socket.io";
import { registerSocketServer } from "./src/lib/socket/server";

const port = parseInt(process.env.PORT || "4000", 10);

// Comma-separated list of allowed origins, e.g. "https://your-app.vercel.app".
// Defaults to "*" so a first deploy just works; lock this down once you know
// your production frontend URL(s).
const allowedOrigins = (process.env.CLIENT_ORIGIN ?? "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  path: "/api/socket",
  cors: {
    origin: allowedOrigins.length === 1 && allowedOrigins[0] === "*" ? "*" : allowedOrigins,
    methods: ["GET", "POST"],
  },
});

registerSocketServer(io);

httpServer.listen(port, () => {
  console.log(`> Socket server ready on :${port} (allowed origins: ${allowedOrigins.join(", ")})`);
});
