import mongoose from "mongoose";

/**
 * Establishes a connection to MongoDB using Mongoose.
 *
 * We pull the connection string from the MONGODB_URI environment variable so
 * that the same codebase can point at a local instance during development and
 * at the Docker-internal hostname in production without any code changes.
 *
 * Mongoose buffers commands internally when the connection is not yet ready, so
 * we do not need to wait for `connectDB` to resolve before defining models or
 * firing queries -- but we still want to know quickly if the database is
 * unreachable, which is why we log both success and failure here.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/livechat";

  try {
    const conn = await mongoose.connect(uri);

    // Log just enough information to confirm which host and database we ended
    // up connecting to. This is genuinely helpful when debugging Docker
    // networking issues where the hostname might resolve unexpectedly.
    console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    // If the initial connection attempt fails we crash the process on purpose.
    // Continuing to run without a database would cause every subsequent request
    // to fail anyway, and an immediate exit makes it obvious in the logs that
    // something went wrong at startup rather than silently dropping requests.
    console.error(`[db] MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
