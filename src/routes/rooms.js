import { Router } from "express";
import Room from "../models/Room.js";
import Message from "../models/Message.js";

/**
 * Express router for room-related REST endpoints.
 *
 * These endpoints cover the typical CRUD-ish operations a client needs to
 * manage chat rooms: listing all rooms, creating a new one, fetching a single
 * room by its ID, and retrieving the message history for a room. We
 * intentionally leave out DELETE and full PUT/PATCH because room deletion has
 * side effects (orphaned messages, users left in a room that no longer
 * exists) that are beyond the scope of this demo.
 */
const router = Router();

// ── GET /api/rooms ──────────────────────────────────────────────────────────
// Returns every room in the database, sorted by creation date (newest first).
// In a real app you would add pagination here, but for a small demo the full
// list is fine.
router.get("/", async (req, res, next) => {
  try {
    const rooms = await Room.find()
      .populate("participants", "username status")
      .sort({ createdAt: -1 });

    res.json(rooms);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/rooms ─────────────────────────────────────────────────────────
// Creates a new chat room. The request body must include a "name" field and
// can optionally include a "description". Mongoose validation will reject the
// request if the name is missing or already taken (unique index).
router.post("/", async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const room = await Room.create({
      name,
      description: description || "",
    });

    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/rooms/:id ──────────────────────────────────────────────────────
// Fetches a single room document by its Mongo ObjectId and populates the
// participants array so the client can display usernames without a second
// round-trip.
router.get("/:id", async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id).populate(
      "participants",
      "username status"
    );

    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.json(room);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/rooms/:id/messages ─────────────────────────────────────────────
// Returns the message history for a given room, ordered from oldest to newest.
// Supports basic pagination through "limit" and "offset" query parameters so
// the client can implement infinite scroll without loading the entire history
// at once.
//
// Example: GET /api/rooms/abc123/messages?limit=20&offset=40
//   -> skip the first 40 messages, return the next 20
router.get("/:id/messages", async (req, res, next) => {
  try {
    // First make sure the room actually exists. We could skip this check and
    // just return an empty array, but an explicit 404 is more helpful for
    // debugging when someone passes a wrong ID.
    const roomExists = await Room.exists({ _id: req.params.id });
    if (!roomExists) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Parse pagination params from the query string. parseInt can return NaN
    // for garbage input, so we fall back to sensible defaults.
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;

    const messages = await Message.find({ room: req.params.id })
      .populate("sender", "username")
      .sort({ createdAt: 1 })
      .skip(offset)
      .limit(limit);

    // We also return the total count so the client knows whether there are
    // more messages to load.
    const total = await Message.countDocuments({ room: req.params.id });

    res.json({ messages, total, limit, offset });
  } catch (err) {
    next(err);
  }
});

export default router;
