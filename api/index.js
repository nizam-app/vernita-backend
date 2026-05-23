import app from "../src/app.js";
import { ensureDb } from "../src/config/db.js";

/**
 * Vercel serverless entry — all HTTP traffic is routed here via vercel.json.
 */
export default async function handler(req, res) {
  try {
    await ensureDb();
  } catch (err) {
    console.error("[vercel] Database unavailable:", err.message);
    return res.status(503).json({
      status: "error",
      message:
        "Database connection failed. On Vercel: set MONGODB_URL in Environment Variables and allow 0.0.0.0/0 in MongoDB Atlas → Network Access.",
      detail: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
  }

  return app(req, res);
}
