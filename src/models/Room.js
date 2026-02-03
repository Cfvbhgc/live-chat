import mongoose from "mongoose";

/**
 * Schema for a chat room.
 *
 * A room is essentially a named channel that users can join. We store the list
 * of participants as an array of User ObjectId references so we can quickly
 * look up who is in a room and populate their usernames when needed.
 *
 * The "description" field is optional -- not every room needs one, but it is
 * nice to have for public rooms where newcomers want to know what the channel
 * is about before joining.
 */
const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Room name is required"],
      unique: true,
      trim: true,
      maxlength: [50, "Room name cannot exceed 50 characters"],
    },

    description: {
      type: String,
      default: "",
      maxlength: [200, "Description cannot exceed 200 characters"],
    },

    // We store an array of references to User documents. When a user joins a
    // room through Socket.io we push their ObjectId onto this array, and when
    // they leave we pull it out. This keeps the "who is in this room" state
    // persisted across server restarts, which is convenient for debugging even
    // though in practice presence is usually ephemeral.
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Room = mongoose.model("Room", roomSchema);

export default Room;
