import httpStatus from "../../../constants/httpStatus.js";
import ApiResponse from "../../../utils/api-response.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import * as fitnessService from "./fitness.service.js";
import {
  validateCreateFitnessEntry,
  validateFitnessIdParam,
  validateFitnessListQuery,
  validateRecentActivityQuery,
  validateUpdateFitnessEntry,
  validateWeeklyStatsQuery,
} from "./fitness.validation.js";

export const createFitnessEntry = catchAsync(async (req, res) => {
  validateCreateFitnessEntry(req.body);
  const entry = await fitnessService.createFitnessEntry(req.user._id, req.body);

  return ApiResponse.success(res, {
    statusCode: httpStatus.CREATED,
    message: "Fitness entry created successfully.",
    data: entry,
  });
});

export const getFitnessEntries = catchAsync(async (req, res) => {
  const filters = validateFitnessListQuery(req.query);
  const result = await fitnessService.getFitnessEntries(req.user._id, filters);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Fitness entries fetched successfully.",
    data: result.items,
    meta: result.meta,
  });
});

export const getFitnessEntryById = catchAsync(async (req, res) => {
  validateFitnessIdParam(req.params.id);
  const entry = await fitnessService.getFitnessEntryById(req.user._id, req.params.id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Fitness entry fetched successfully.",
    data: entry,
  });
});

export const updateFitnessEntry = catchAsync(async (req, res) => {
  validateFitnessIdParam(req.params.id);
  validateUpdateFitnessEntry(req.body);
  const entry = await fitnessService.updateFitnessEntry(req.user._id, req.params.id, req.body);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Fitness entry updated successfully.",
    data: entry,
  });
});

export const deleteFitnessEntry = catchAsync(async (req, res) => {
  validateFitnessIdParam(req.params.id);
  const entry = await fitnessService.deleteFitnessEntry(req.user._id, req.params.id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Fitness entry deleted successfully.",
    data: entry,
  });
});

export const getRecentActivity = catchAsync(async (req, res) => {
  const filters = validateRecentActivityQuery(req.query);
  const entries = await fitnessService.getRecentActivity(req.user._id, filters);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Recent fitness activity fetched successfully.",
    data: entries,
  });
});

export const getWeeklyStats = catchAsync(async (req, res) => {
  const filters = validateWeeklyStatsQuery(req.query);
  const stats = await fitnessService.getWeeklyStats(req.user._id, filters);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Weekly fitness stats fetched successfully.",
    data: stats,
  });
});
