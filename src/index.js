/**
 * Entry point for the live-chat server.
 *
 * This file wires together Express (for the REST API), Socket.io (for
 * real-time messaging), and Mongoose (for MongoDB persistence). We create a
 * raw `http.Server` and pass it to both Express and Socket.io so they share
 * the same port -- that way the REST endpoints and the WebSocket upgrade
 * handshake both live on port 3000 and we do not need to manage multiple
 * listeners.
 */

import { createServer } from "node:http";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

// Load .env variables as early as possible so every module below can read
// process.env.* without worrying about import order.
dotenv.config();

import connectDB from "./config/db.js";
import roomRoutes from "./routes/rooms.js";
import userRoutes from "./routes/users.js";
import errorHandler from "./middleware/errorHandler.js";
import registerSocketHandlers from "./socket/handler.js";

// ── Express setup ───────────────────────────────────────────────────────────

const app = express();

// Parse incoming JSON bodies. The default limit is 100kb which is more than
// enough for chat messages; bump it up if you ever add file-upload endpoints.
app.json = express.json();
app.use(express.json());

// Enable CORS for all origins during development. In production you would
// restrict this to your frontend's domain, but an open policy makes it much
// easier to test with tools like Postman or a local React dev server.
app.use(cors());

// Mount the REST routers under /api so all endpoints are namespaced and will
// not collide with any static files you might serve in the future.
app.use("/api/rooms", roomRoutes);
app.use("/api/users", userRoutes);

// A minimal health-check endpoint. Useful for Docker HEALTHCHECK directives,
// load-balancer probes, and quick "is it running?" sanity checks.
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// The error handler must be registered AFTER all routes. Express skips normal
// middleware and jumps straight to error handlers whenever `next(err)` is
// called or an async route throws.
app.use(errorHandler);

// ── HTTP + Socket.io setup ──────────────────────────────────────────────────

// We create the HTTP server ourselves instead of letting Express do it behind
// the scenes so that we can hand the same server instance to Socket.io.
const httpServer = createServer(app);

// Initialise Socket.io on top of the shared HTTP server. The cors option
// mirrors what we set on Express -- allow any origin during development.
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Attach all Socket.io event handlers (join-room, send-message, etc.).
registerSocketHandlers(io);

// ── Start the server ────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

/**
 * We connect to the database first and only start listening for HTTP requests
 * once the connection is established. This ordering guarantees that no request
 * handler will ever run against a disconnected database. If connectDB fails
 * it calls process.exit(1) internally, so we do not need a catch block here.
 */
const start = async () => {
  await connectDB();

  httpServer.listen(PORT, () => {
    console.log(`[server] Live-chat server running on http://localhost:${PORT}`);
    console.log(`[server] Socket.io accepting connections on the same port`);
  });
};

start();
