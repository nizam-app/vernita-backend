// src/middlewares/globalError.js

import AppError from "../utils/AppError.js";

// Express error middleware signature: (err, req, res, next)
export const globalError = (err, req, res, next) => {
  // default fallback
  const statusCode = err.statusCode || 500;
  const status = err.status || "error";

  // ----- Multer errors -----
  if (err?.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      err = new AppError("File too large. Max size is 5MB.", 400);
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      err = new AppError(`Unexpected file field: ${err.field}`, 400);
    } else {
      err = new AppError(err.message || "File upload failed.", 400);
    }
  }

  // ----- Mongoose CastError: invalid ObjectId -----
  if (err.name === "CastError") {
    err = new AppError("Invalid ID format", 400);
  }

  // ----- Mongoose duplicate key error -----
  if (err.code === 11000) {
    const kv = err.keyValue || {};
    const keys = Object.keys(kv);
    const dupMsg = String(err.message || "");
    if (
      (keys.includes("courseId") && keys.includes("sortOrder")) ||
      dupMsg.includes("courseId") && dupMsg.includes("sortOrder")
    ) {
      err = new AppError(
        "A lesson with this sort order already exists for this course. Choose a different sortOrder.",
        409
      );
    } else {
      const field = keys[0] || "field";
      err = new AppError(`${field} already exists`, 409);
    }
  }

  // ----- Mongoose validation error -----
  if (err.name === "ValidationError") {
    // সব validation message একসাথে এনে string বানানো
    const msgs = Object.values(err.errors || {}).map((e) => e.message);
    err = new AppError(msgs.join(", "), 400);
  }

  // ----- JWT errors (optional) -----
  if (err.name === "JsonWebTokenError") err = new AppError("Invalid token", 401);
  if (err.name === "TokenExpiredError") err = new AppError("Token expired", 401);

  // ----- express-rate-limit -----
  if (err.statusCode === 429 || err.status === 429) {
    err = new AppError(err.message || "Too many requests. Please try again later.", 429);
  }

  // ----- MongoDB connection (common on Vercel / Atlas) -----
  if (
    err.name === "MongooseServerSelectionError" ||
    err.name === "MongoServerSelectionError" ||
    /buffering timed out/i.test(err.message || "")
  ) {
    err = new AppError(
      "Database connection failed. Check MONGODB_URL on Vercel and MongoDB Atlas Network Access (allow 0.0.0.0/0).",
      503
    );
  }

  // final response
  res.status(err.statusCode || statusCode).json({
    status: err.status || status,
    message: err.message || "Something went wrong",
  });
};
