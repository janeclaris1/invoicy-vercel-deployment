const mongoose = require("mongoose");
const logger = require("../utils/logger");

const isServerless = Boolean(process.env.VERCEL);
const isDirectServerStart = require.main === module;

let cached = global.__mongooseCache;
if (!cached) {
  cached = global.__mongooseCache = { conn: null, promise: null };
}

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGO_URI) {
    const errorMsg = "MONGO_URI not found in environment variables";
    logger.error(errorMsg);
    if (process.env.NODE_ENV === "production" && !isServerless && isDirectServerStart) {
      throw new Error(errorMsg);
    }
    return null;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: isServerless ? 8000 : 10000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      })
      .then((conn) => {
        logger.info(`MongoDB connected successfully: ${conn.connection.host}`);
        cached.conn = conn;
        return conn;
      })
      .catch((error) => {
        cached.promise = null;
        cached.conn = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    logger.error("Error connecting to MongoDB:", error.message);
    logger.error("Please check:");
    logger.error("   1) MongoDB URI is correct in environment variables");
    logger.error("   2) IP address is whitelisted in MongoDB Atlas (use 0.0.0.0/0 for Vercel)");
    logger.error("   3) MongoDB Atlas cluster is running (not paused)");

    if (process.env.NODE_ENV === "production" && !isServerless && isDirectServerStart) {
      throw error;
    }

    return null;
  }
};

module.exports = connectDB;
