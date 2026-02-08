import { Router } from "express";
import User from "../models/User.js";

/**
 * Express router for user-related REST endpoints.
 *
 * The user model in this project is intentionally simple: we just store a
 * username and an online/offline status. There is no authentication layer --
 * adding JWT or session-based auth would be straightforward but is outside
 * the scope of this real-time chat demo. If you need auth, the usual approach
 * is to add a POST /api/auth/login endpoint that returns a token, then verify
 * that token in a middleware before allowing socket connections and API calls.
 */
const router = Router();

// ── GET /api/users ──────────────────────────────────────────────────────────
// Returns all users, sorted alphabetically by username. This is used by the
// frontend sidebar to show the full member list along with each person's
// online/offline indicator.
router.get("/", async (req, res, next) => {
  try {
    const users = await User.find().sort({ username: 1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/users ─────────────────────────────────────────────────────────
// Registers a new user. The only required field is "username" -- Mongoose
// validation takes care of enforcing uniqueness, minimum length, and so on.
// We return the newly created document with a 201 status to follow REST
// conventions.
router.post("/", async (req, res, next) => {
  try {
    const { username } = req.body;

    const user = await User.create({ username });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/users/:id/status ─────────────────────────────────────────────
// Updates a user's online/offline status. The Socket.io handler also does this
// in real time, but having a REST endpoint as well is useful for admin tools
// or batch operations (e.g., marking everyone offline after a deploy).
//
// Expected body: { "status": "online" } or { "status": "offline" }
router.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;

    // Validate the status value before hitting the database. We could let
    // Mongoose's enum validator handle this, but checking it here lets us
    // return a friendlier error message.
    if (!status || !["online", "offline"].includes(status)) {
      return res.status(400).json({
        error: 'Status must be either "online" or "offline"',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      // `new: true` tells Mongoose to return the document *after* the update,
      // and `runValidators` ensures the schema validators still run on the
      // patched fields.
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
