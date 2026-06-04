import httpStatus from "../../constants/httpStatus.js";
import ApiResponse from "../../utils/api-response.js";
import { catchAsync } from "../../utils/catchAsync.js";
import * as consultationService from "./consultation.service.js";

const getClientIp = (req) => {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) return xf.split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "";
};

const buildRequestMeta = (req) => ({
  ip: getClientIp(req),
  userAgent: String(req.headers["user-agent"] || "").slice(0, 500),
  referer: String(req.headers.referer || "").slice(0, 500),
});

export const submitConsultation = catchAsync(async (req, res) => {
  const data = await consultationService.createConsultationRequest(req.body, buildRequestMeta(req));

  return ApiResponse.success(res, {
    statusCode: httpStatus.CREATED,
    message: "Consultation request submitted successfully. We will contact you soon.",
    data,
  });
});
