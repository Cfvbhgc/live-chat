import User from "../models/User.js";
import Room from "../models/Room.js";
import Message from "../models/Message.js";

/**
 * Registers all Socket.io event handlers on the given server instance.
 *
 * We separate the socket logic from the Express setup so that index.js stays
 * clean and focused on wiring things together. All real-time features -- room
 * joining, messaging, typing indicators, presence -- live in this file.
 *
 * A quick note on error handling: unlike Express, Socket.io does not have a
 * built-in middleware chain for errors. We wrap every handler in a try/catch
 * and emit an "error" event back to the client when something goes wrong.
 * The client should listen for that event and display the message to the user
 * or log it for debugging.
 *
 * @param {import("socket.io").Server} io - The Socket.io server instance
 */
const registerSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log(`[socket] Client connected: ${socket.id}`);

    // ── join-room ─────────────────────────────────────────────────────
    // When a client wants to participate in a room they emit "join-room"
    // with the roomId and their userId. We use Socket.io's built-in room
    // abstraction (socket.join) so that subsequent messages broadcast to
    // the room automatically reach the right set of sockets. We also
    // persist the participant in the Room document so the REST API can
    // answer "who is in this room?" without asking Socket.io.
    socket.on("join-room", async ({ roomId, userId }) => {
      try {
        // Make sure both the room and the user actually exist before
        // doing anything. This prevents ghost entries in the participants
        // array if the client passes a stale or fabricated ID.
        const room = await Room.findById(roomId);
        if (!room) {
          return socket.emit("error", { message: "Room not found" });
        }

        const user = await User.findById(userId);
        if (!user) {
          return socket.emit("error", { message: "User not found" });
        }

        // Join the Socket.io room so broadcast calls in "send-message"
        // and "typing" automatically include this socket.
        socket.join(roomId);

        // Persist the participant reference only if it is not already in
        // the array. The $addToSet operator does exactly this -- it
        // behaves like a set insertion, preventing duplicates.
        await Room.findByIdAndUpdate(roomId, {
          $addToSet: { participants: userId },
        });

        // Notify everyone else in the room that a new user has joined.
        // We use socket.to(roomId) instead of io.to(roomId) so the
        // sender does not receive their own join notification.
        socket.to(roomId).emit("user-joined", { userId, roomId });

        console.log(`[socket] User ${userId} joined room ${roomId}`);
      } catch (err) {
        console.error(`[socket] join-room error: ${err.message}`);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // ── leave-room ────────────────────────────────────────────────────
    // The counterpart to join-room. We pull the user from the
    // participants array and leave the Socket.io room.
    socket.on("leave-room", async ({ roomId, userId }) => {
      try {
        socket.leave(roomId);

        // Remove the participant from the stored array.
        await Room.findByIdAndUpdate(roomId, {
          $pull: { participants: userId },
        });

        socket.to(roomId).emit("user-left", { userId, roomId });

        console.log(`[socket] User ${userId} left room ${roomId}`);
      } catch (err) {
        console.error(`[socket] leave-room error: ${err.message}`);
        socket.emit("error", { message: "Failed to leave room" });
      }
    });

    // ── send-message ──────────────────────────────────────────────────
    // The main event in any chat app. The client sends the text content
    // along with the room and user IDs. We persist the message in Mongo
    // and then broadcast it to every socket in the room (including the
    // sender, so their UI can display the server-assigned timestamp and
    // ObjectId rather than relying on an optimistic local copy).
    socket.on("send-message", async ({ roomId, userId, content }) => {
      try {
        if (!content || content.trim().length === 0) {
          return socket.emit("error", { message: "Message cannot be empty" });
        }

        // Create and save the message document.
        const message = await Message.create({
          room: roomId,
          sender: userId,
          content: content.trim(),
        });

        // Populate the sender field so the broadcast includes the
        // username -- this saves every client from having to look it up.
        const populated = await message.populate("sender", "username");

        // Broadcast to the entire room, sender included.
        io.to(roomId).emit("new-message", populated);

        console.log(`[socket] Message in room ${roomId} from user ${userId}`);
      } catch (err) {
        console.error(`[socket] send-message error: ${err.message}`);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ── typing ────────────────────────────────────────────────────────
    // A lightweight event that tells other people in the room that
    // someone is currently typing. We do NOT persist this to the
    // database -- it is purely ephemeral UI feedback. The client should
    // debounce this event so it does not fire on every single keystroke.
    socket.on("typing", ({ roomId, userId }) => {
      socket.to(roomId).emit("user-typing", { userId, roomId });
    });

    // ── user-online ───────────────────────────────────────────────────
    // Marks a user as online in the database and broadcasts the status
    // change so connected clients can update their member list.
    socket.on("user-online", async ({ userId }) => {
      try {
        await User.findByIdAndUpdate(userId, { status: "online" });
        // Broadcast to all connected sockets (not just a specific room)
        // because presence is a global concept -- if you are online, you
        // are online everywhere.
        io.emit("status-change", { userId, status: "online" });

        console.log(`[socket] User ${userId} is now online`);
      } catch (err) {
        console.error(`[socket] user-online error: ${err.message}`);
        socket.emit("error", { message: "Failed to update status" });
      }
    });

    // ── user-offline ──────────────────────────────────────────────────
    // The explicit counterpart to user-online. Clients should emit this
    // when the user deliberately signs out or closes the app. For
    // unexpected disconnects (network drop, tab close) see the
    // "disconnect" handler below.
    socket.on("user-offline", async ({ userId }) => {
      try {
        await User.findByIdAndUpdate(userId, { status: "offline" });
        io.emit("status-change", { userId, status: "offline" });

        console.log(`[socket] User ${userId} is now offline`);
      } catch (err) {
        console.error(`[socket] user-offline error: ${err.message}`);
        socket.emit("error", { message: "Failed to update status" });
      }
    });

    // ── disconnect ────────────────────────────────────────────────────
    // Socket.io fires this automatically when the underlying transport
    // is closed (the user closes their browser tab, their network drops,
    // etc.). We log it here for debugging; in a more complete app you
    // might also mark the user as offline and remove them from all room
    // participant lists, but that requires maintaining a socket-to-user
    // mapping which adds complexity we are skipping for now.
    socket.on("disconnect", (reason) => {
      console.log(`[socket] Client disconnected: ${socket.id} (${reason})`);
    });
  });
};

export default registerSocketHandlers;
