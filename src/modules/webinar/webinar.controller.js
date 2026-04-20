import httpStatus from "../../constants/httpStatus.js";
import { catchAsync } from "../../utils/catchAsync.js";
import ApiResponse from "../../utils/api-response.js";
import * as webinarService from "./webinar.service.js";
import {
  validateWebinarIdParam,
  validateWebinarListQuery,
} from "./webinar.validation.js";

export const getWebinars = catchAsync(async (req, res) => {
  const query = validateWebinarListQuery(req.query);
  const result = await webinarService.getPublishedWebinars(query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Webinars fetched successfully.",
    data: result.items,
    meta: result.meta,
  });
});

export const getWebinarCategories = catchAsync(async (req, res) => {
  const categories = await webinarService.getPublishedWebinarCategories();

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Webinar categories fetched successfully.",
    data: categories,
  });
});

export const getWebinarById = catchAsync(async (req, res) => {
  validateWebinarIdParam(req.params.id);
  const webinar = await webinarService.getPublishedWebinarById(req.params.id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Webinar fetched successfully.",
    data: webinar,
  });
});

export const registerForWebinar = catchAsync(async (req, res) => {
  validateWebinarIdParam(req.params.id);
  const result = await webinarService.registerForWebinar(req.params.id, req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: result.paymentRequired
      ? "Registration created. Payment is pending."
      : "Webinar registered successfully.",
    data: result,
  });
});

export const getMyWebinars = catchAsync(async (req, res) => {
  const query = validateWebinarListQuery(req.query);
  const result = await webinarService.getMyWebinarsPaginated(req.user._id, query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "My webinars fetched successfully.",
    data: result.items,
    meta: result.meta,
  });
});

export const joinWebinar = catchAsync(async (req, res) => {
  validateWebinarIdParam(req.params.id);
  const result = await webinarService.joinWebinarSession(req.params.id, req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Join link fetched successfully.",
    data: result,
  });
});
