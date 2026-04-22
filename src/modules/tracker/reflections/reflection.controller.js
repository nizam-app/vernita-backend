import httpStatus from "../../../constants/httpStatus.js";
import ApiResponse from "../../../utils/api-response.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import * as reflectionService from "./reflection.service.js";
import {
  validateCreateReflection,
  validateDateParam,
  validateReflectionIdParam,
  validateReflectionListQuery,
  validateUpdateReflection,
} from "./reflection.validation.js";

export const createReflection = catchAsync(async (req, res) => {
  validateCreateReflection(req.body);
  const entry = await reflectionService.createReflection(req.user._id, req.body);

  return ApiResponse.success(res, {
    statusCode: httpStatus.CREATED,
    message: "Reflection entry created successfully.",
    data: entry,
  });
});

export const getReflections = catchAsync(async (req, res) => {
  const filters = validateReflectionListQuery(req.query);
  const result = await reflectionService.getReflections(req.user._id, filters);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Reflection history fetched successfully.",
    data: result.items,
    meta: result.meta,
  });
});

export const getReflectionById = catchAsync(async (req, res) => {
  validateReflectionIdParam(req.params.id);
  const entry = await reflectionService.getReflectionById(req.user._id, req.params.id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Reflection entry fetched successfully.",
    data: entry,
  });
});

export const getReflectionByDate = catchAsync(async (req, res) => {
  const entryDate = validateDateParam(req.params.date);
  const entry = await reflectionService.getReflectionByDate(req.user._id, entryDate);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Reflection entry fetched successfully.",
    data: entry,
  });
});

export const updateReflection = catchAsync(async (req, res) => {
  validateReflectionIdParam(req.params.id);
  validateUpdateReflection(req.body);
  const entry = await reflectionService.updateReflection(req.user._id, req.params.id, req.body);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Reflection entry updated successfully.",
    data: entry,
  });
});

export const deleteReflection = catchAsync(async (req, res) => {
  validateReflectionIdParam(req.params.id);
  const entry = await reflectionService.deleteReflection(req.user._id, req.params.id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Reflection entry deleted successfully.",
    data: entry,
  });
});
