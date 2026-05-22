import rateLimit from "express-rate-limit";
import httpStatus from "../constants/httpStatus.js";

/**
 * Reusable rate limiter for public form endpoints.
 * @param {object} options
 * @param {number} options.windowMs
 * @param {number} options.max
 * @param {string} options.message
 */
export const createRateLimiter = ({
  windowMs = 10 * 60 * 1000,
  max = 15,
  message = "Too many requests. Please try again later.",
} = {}) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: "fail", message },
    statusCode: httpStatus.TOO_MANY_REQUESTS,
  });

/** Consultation form: stricter limit than generic APIs. */
export const consultationFormLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many consultation requests. Please try again in a few minutes.",
});
