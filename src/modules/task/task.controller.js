import httpStatus from "../../constants/httpStatus.js";
import ApiResponse from "../../utils/api-response.js";
import { catchAsync } from "../../utils/catchAsync.js";
import * as taskService from "./task.service.js";
import {
  validateCompleteTask,
  validateCreateTask,
  validateTaskIdParam,
  validateTaskListQuery,
  validateUpdateTask,
} from "./task.validation.js";

export const createTask = catchAsync(async (req, res) => {
  validateCreateTask(req.body);
  const task = await taskService.createTask(req.user._id, req.body);

  return ApiResponse.success(res, {
    statusCode: httpStatus.CREATED,
    message: "Task created successfully.",
    data: task,
  });
});

export const getTasks = catchAsync(async (req, res) => {
  const query = validateTaskListQuery(req.query);
  const result = await taskService.getTasks(req.user._id, query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Tasks fetched successfully.",
    data: result.items,
    meta: result.meta,
  });
});

export const getTaskById = catchAsync(async (req, res) => {
  validateTaskIdParam(req.params.id);
  const task = await taskService.getTaskById(req.params.id, req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Task fetched successfully.",
    data: task,
  });
});

export const updateTask = catchAsync(async (req, res) => {
  validateTaskIdParam(req.params.id);
  validateUpdateTask(req.body);
  const task = await taskService.updateTask(req.params.id, req.user._id, req.body);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Task updated successfully.",
    data: task,
  });
});

export const completeTask = catchAsync(async (req, res) => {
  validateTaskIdParam(req.params.id);
  const { completed } = validateCompleteTask(req.body || {});
  const task = await taskService.completeTask(req.params.id, req.user._id, completed);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: completed
      ? "Task completed successfully."
      : "Task marked incomplete successfully.",
    data: task,
  });
});

export const deleteTask = catchAsync(async (req, res) => {
  validateTaskIdParam(req.params.id);
  const task = await taskService.deleteTask(req.params.id, req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Task deleted successfully.",
    data: task,
  });
});

export const getSummaryCounts = catchAsync(async (req, res) => {
  const counts = await taskService.getSummaryCounts(req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Task summary counts fetched successfully.",
    data: counts,
  });
});
