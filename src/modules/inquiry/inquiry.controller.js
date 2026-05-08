import httpStatus from "../../constants/httpStatus.js";
import ApiResponse from "../../utils/api-response.js";
import { catchAsync } from "../../utils/catchAsync.js";
import ApiError from "../../utils/api-error.js";
import { validateCreateInquiry } from "./inquiry.validation.js";
import { Inquiry } from "./inquiry.model.js";

// Very small in-memory rate limiter (per IP). Good enough for single-node.
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_MAX = 20; // 20 submissions / window / IP
const ipBucket = new Map();

const getClientIp = (req) => {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) return xf.split(",")[0].trim();
  return req.ip || req.connection?.remoteAddress || "";
};

const rateLimitOrThrow = (req) => {
  const ip = getClientIp(req) || "unknown";
  const now = Date.now();
  const b = ipBucket.get(ip);
  if (!b || now - b.start > RATE_WINDOW_MS) {
    ipBucket.set(ip, { start: now, count: 1 });
    return;
  }
  b.count += 1;
  if (b.count > RATE_MAX) {
    throw new ApiError(httpStatus.TOO_MANY_REQUESTS, "Too many requests. Please try again later.");
  }
};

export const createInquiry = catchAsync(async (req, res) => {
  rateLimitOrThrow(req);

  const payload = validateCreateInquiry(req.body);

  // honeypot
  if (payload.website) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid submission.");
  }

  const ip = getClientIp(req);
  const ua = String(req.headers["user-agent"] || "").slice(0, 500);
  const referer = String(req.headers.referer || "").slice(0, 500);

  const inquiry = await Inquiry.create({
    fullName: payload.fullName,
    email: payload.email,
    phoneNumber: payload.phoneNumber,
    serviceInterestedIn: payload.serviceInterestedIn,
    message: payload.message,
    source: payload.source || "website",
    meta: { ip, userAgent: ua, referer },
  });

  return ApiResponse.success(res, {
    statusCode: httpStatus.CREATED,
    message: "Inquiry submitted successfully.",
    data: { id: inquiry._id },
  });
});

