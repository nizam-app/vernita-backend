import httpStatus from "../../constants/httpStatus.js";
import { catchAsync as asyncHandler } from "../../utils/catchAsync.js";
import ApiResponse from "../../utils/api-response.js";
import * as coachingService from "./coaching.service.js";
import {
  validateAdminPackageListQuery,
  validateCreateCoachingPackage,
  validateIdParam,
  validateScheduleSession,
  validateTogglePayload,
  validateUpdateCoachingPackage,
  validateUserPackageListQuery,
  validatePurchaseIdParam,
} from "./coaching.validation.js";

// Admin controllers
export const adminCreateCoachingPackage = asyncHandler(async (req, res) => {
  const payload = validateCreateCoachingPackage(req.body);
  const pkg = await coachingService.createCoachingPackage(payload, req.user?._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.CREATED,
    message: "Coaching package created successfully.",
    data: pkg,
  });
});

export const adminGetCoachingPackages = asyncHandler(async (req, res) => {
  const query = validateAdminPackageListQuery(req.query);
  const result = await coachingService.getAdminCoachingPackages(query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Coaching packages fetched successfully.",
    data: result.data,
    meta: result.meta,
  });
});

export const adminGetCoachingPackageById = asyncHandler(async (req, res) => {
  validateIdParam(req.params);
  const pkg = await coachingService.getAdminCoachingPackageById(req.params.id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Coaching package fetched successfully.",
    data: pkg,
  });
});

export const adminUpdateCoachingPackage = asyncHandler(async (req, res) => {
  validateIdParam(req.params);
  const payload = validateUpdateCoachingPackage(req.body);
  const pkg = await coachingService.updateAdminCoachingPackage(
    req.params.id,
    payload,
    req.user?._id
  );

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Coaching package updated successfully.",
    data: pkg,
  });
});

export const adminDeleteCoachingPackage = asyncHandler(async (req, res) => {
  validateIdParam(req.params);
  const pkg = await coachingService.softDeleteAdminCoachingPackage(
    req.params.id,
    req.user?._id
  );

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Coaching package deleted successfully.",
    data: pkg,
  });
});

export const adminToggleCoachingPackagePublish = asyncHandler(async (req, res) => {
  validateIdParam(req.params);
  const { value } = validateTogglePayload(req.body);
  const pkg = await coachingService.toggleAdminCoachingPackagePublish(
    req.params.id,
    value,
    req.user?._id
  );

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Coaching package publish status updated successfully.",
    data: pkg,
  });
});

export const adminToggleCoachingPackageFeatured = asyncHandler(async (req, res) => {
  validateIdParam(req.params);
  const { value } = validateTogglePayload(req.body);
  const pkg = await coachingService.toggleAdminCoachingPackageFeatured(
    req.params.id,
    value,
    req.user?._id
  );

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Coaching package featured status updated successfully.",
    data: pkg,
  });
});

export const adminGetPackagePurchases = asyncHandler(async (req, res) => {
  validateIdParam(req.params);
  const result = await coachingService.getAdminPackagePurchases(req.params.id, req.query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Coaching purchases fetched successfully.",
    data: result.data,
    meta: result.meta,
  });
});

// User controllers
export const getPublishedCoachingPackages = asyncHandler(async (req, res) => {
  const query = validateUserPackageListQuery(req.query);
  const result = await coachingService.getPublishedCoachingPackages(query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Coaching packages fetched successfully.",
    data: result.data,
    meta: result.meta,
  });
});

export const getFeaturedCoachingPackages = asyncHandler(async (req, res) => {
  const packages = await coachingService.getFeaturedCoachingPackages();

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Featured coaching packages fetched successfully.",
    data: packages,
  });
});

export const getCoachingPackageDetails = asyncHandler(async (req, res) => {
  validateIdParam(req.params);
  const pkg = await coachingService.getPublishedCoachingPackageById(req.params.id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Coaching package fetched successfully.",
    data: pkg,
  });
});

export const purchaseCoachingPackage = asyncHandler(async (req, res) => {
  validateIdParam(req.params);
  const result = await coachingService.purchaseCoachingPackage(req.user._id, req.params.id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Coaching package purchased successfully.",
    data: result,
  });
});

export const getMyCoaching = asyncHandler(async (req, res) => {
  const purchases = await coachingService.getMyCoaching(req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "My coaching fetched successfully.",
    data: purchases,
  });
});

export const getMyCoachingDetail = asyncHandler(async (req, res) => {
  validatePurchaseIdParam(req.params);
  const detail = await coachingService.getMyCoachingByPurchaseId(req.user._id, req.params.purchaseId);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "My coaching fetched successfully.",
    data: detail,
  });
});

export const scheduleMySession = asyncHandler(async (req, res) => {
  validatePurchaseIdParam(req.params);
  const payload = validateScheduleSession(req.body);
  const session = await coachingService.scheduleMyCoachingSession(
    req.user._id,
    req.params.purchaseId,
    payload
  );

  return ApiResponse.success(res, {
    statusCode: httpStatus.CREATED,
    message: "Coaching session scheduled successfully.",
    data: session,
  });
});

export const getMySessions = asyncHandler(async (req, res) => {
  validatePurchaseIdParam(req.params);
  const sessions = await coachingService.getMyCoachingSessions(req.user._id, req.params.purchaseId);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Coaching sessions fetched successfully.",
    data: sessions,
  });
});

