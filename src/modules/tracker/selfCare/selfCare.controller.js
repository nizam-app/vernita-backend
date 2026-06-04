import httpStatus from "../../../constants/httpStatus.js";
import ApiResponse from "../../../utils/api-response.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import * as selfCareService from "./selfCare.service.js";
import {
  validateHistoryQuery,
  validateSelfCareIdParam,
  validateStatsQuery,
  validateTodayPatch,
  validateTodayUpsert,
} from "./selfCare.validation.js";

export const getTodayEntry = catchAsync(async (req, res) => {
  const entry = await selfCareService.getTodayEntry(req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Today's self-care entry fetched successfully.",
    data: entry,
  });
});

export const upsertTodayEntry = catchAsync(async (req, res) => {
  validateTodayUpsert(req.body);
  const entry = await selfCareService.upsertTodayEntry(req.user._id, req.body);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Today's self-care entry saved successfully.",
    data: entry,
  });
});

export const patchTodayEntry = catchAsync(async (req, res) => {
  validateTodayPatch(req.body);
  const entry = await selfCareService.patchTodayEntry(req.user._id, req.body);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Today's self-care entry updated successfully.",
    data: entry,
  });
});

export const getHistory = catchAsync(async (req, res) => {
  const filters = validateHistoryQuery(req.query);
  const result = await selfCareService.getHistory(req.user._id, filters);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Self-care history fetched successfully.",
    data: result.items,
    meta: result.meta,
  });
});

export const getEntryById = catchAsync(async (req, res) => {
  validateSelfCareIdParam(req.params.id);
  const entry = await selfCareService.getEntryById(req.user._id, req.params.id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Self-care entry fetched successfully.",
    data: entry,
  });
});

export const deleteEntry = catchAsync(async (req, res) => {
  validateSelfCareIdParam(req.params.id);
  const entry = await selfCareService.softDeleteEntry(req.user._id, req.params.id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Self-care entry deleted successfully.",
    data: entry,
  });
});

export const getWeeklyStats = catchAsync(async (req, res) => {
  const filters = validateStatsQuery(req.query);
  const stats = await selfCareService.getWeeklyStats(req.user._id, filters);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Weekly self-care stats fetched successfully.",
    data: stats,
  });
});

export const getSummaryStats = catchAsync(async (req, res) => {
  const filters = validateStatsQuery(req.query);
  const stats = await selfCareService.getSummaryStats(req.user._id, filters);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Self-care summary stats fetched successfully.",
    data: stats,
  });
});
