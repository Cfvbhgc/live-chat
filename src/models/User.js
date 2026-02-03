import mongoose from "mongoose";

/**
 * Schema for a chat user.
 *
 * We keep the user model intentionally lightweight -- just a username and a
 * status field. In a production app you would likely bolt on authentication
 * fields (hashed password, OAuth tokens, etc.), but for this project the focus
 * is on the real-time messaging layer, not user management, so we keep it
 * minimal to avoid unnecessary complexity.
 *
 * The "status" field can be either "online" or "offline". We update it
 * whenever a Socket.io client emits "user-online" / "user-offline", and also
 * through the REST PATCH endpoint so that an external service (or an admin
 * dashboard) can flip the flag without needing a WebSocket connection.
 */
const userSchema = new mongoose.Schema(
  {
    // Usernames must be unique because we use them as the human-readable
    // identifier in the UI. Trimming whitespace prevents subtle duplicates
    // like "alice" vs "alice " from slipping through.
    username: {
      type: String,
      required: [true, "A username is required"],
      unique: true,
      trim: true,
      minlength: [2, "Username must be at least 2 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
    },

    // We default to "offline" because a freshly registered user has not opened
    // a socket connection yet. The status switches to "online" once the client
    // emits the "user-online" event.
    status: {
      type: String,
      enum: ["online", "offline"],
      default: "offline",
    },
  },
  {
    // Mongoose adds createdAt and updatedAt automatically when you turn on
    // timestamps. We use updatedAt on the frontend to show "last seen" info.
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
