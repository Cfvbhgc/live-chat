import mongoose from "mongoose";

/**
 * Schema for a single chat message.
 *
 * Messages are the core data unit in the app. Each one belongs to exactly one
 * room and is authored by exactly one user. We store both references as
 * ObjectIds so Mongoose can populate them when we fetch message history.
 *
 * We deliberately do not add a "read" or "delivered" flag here. Read receipts
 * are a feature that touches many parts of the stack (per-user tracking,
 * batch updates, UI indicators) and would balloon the scope of this project
 * without adding much to the real-time messaging demo. If you wanted to add
 * them later, you would probably create a separate "ReadReceipt" collection
 * rather than embedding that state directly in the message document.
 */
const messageSchema = new mongoose.Schema(
  {
    // The room this message was sent to. Indexing this field makes the
    // "get messages for room X" query fast, which is the most common read
    // pattern in the app.
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: [true, "A room reference is required"],
      index: true,
    },

    // The user who authored the message.
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A sender reference is required"],
    },

    // The actual text content. We enforce a minimum length of 1 to prevent
    // blank messages from cluttering the chat.
    content: {
      type: String,
      required: [true, "Message content cannot be empty"],
      minlength: [1, "Message must have at least one character"],
      maxlength: [2000, "Messages are limited to 2000 characters"],
    },
  },
  {
    // The createdAt timestamp doubles as the "sent at" time for the message.
    // Using Mongoose timestamps rather than a custom field means we get a
    // consistent Date object with millisecond precision for free.
    timestamps: true,
  }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
