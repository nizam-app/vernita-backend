import httpStatus from "../../constants/httpStatus.js";
import ApiResponse from "../../utils/api-response.js";
import { catchAsync } from "../../utils/catchAsync.js";
import ApiError from "../../utils/api-error.js";
import * as consultationService from "./consultation.service.js";

const ensureMongoId = (value, fieldName = "id") => {
  if (!value || typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a valid id.`);
  }
};

export const adminListConsultations = catchAsync(async (req, res) => {
  const result = await consultationService.listConsultationRequests(req.query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Consultation requests fetched successfully.",
    data: result.items,
    meta: result.meta,
  });
});

export const adminGetConsultationById = catchAsync(async (req, res) => {
  ensureMongoId(req.params.id);
  const data = await consultationService.getConsultationRequestById(req.params.id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Consultation request fetched successfully.",
    data,
  });
});
