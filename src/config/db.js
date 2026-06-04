// src/config/db.js
import mongoose from "mongoose";
import { env } from "./env.js";

mongoose.set("strictQuery", true);
// Fail fast on serverless when DB is unreachable (avoid 10s buffer on every query)
mongoose.set("bufferCommands", false);

const globalCache = globalThis;

const getCache = () => {
  if (!globalCache.__mongooseCache) {
    globalCache.__mongooseCache = { promise: null };
  }
  return globalCache.__mongooseCache;
};

const connectionOptions = {
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  /** Prefer IPv4 — avoids some cloud → Atlas connection issues */
  family: 4,
};

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const cache = getCache();

  if (!cache.promise) {
    const uri = env.MONGODB_URL;
    if (!uri.startsWith("mongodb")) {
      throw new Error("MONGODB_URL must start with mongodb:// or mongodb+srv://");
    }

    cache.promise = mongoose
      .connect(uri, connectionOptions)
      .then(() => {
        console.log("✅ MongoDB connected");
        return mongoose.connection;
      })
      .catch((err) => {
        cache.promise = null;
        console.error("❌ MongoDB connection failed:", err.message);
        throw err;
      });
  }

  return cache.promise;
};

export const ensureDb = async () => connectDB();

export const pingDb = async () => {
  await ensureDb();
  if (mongoose.connection.db) {
    await mongoose.connection.db.admin().command({ ping: 1 });
  }
  return true;
};
