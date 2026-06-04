import httpStatus from "../../constants/httpStatus.js";
import ApiResponse from "../../utils/api-response.js";
import { catchAsync } from "../../utils/catchAsync.js";
import * as goalService from "./goal.service.js";
import {
  validateAddMilestone,
  validateArchiveAction,
  validateCreateGoal,
  validateGoalIdParam,
  validateGoalListQuery,
  validateMilestoneIdParam,
  validateUpdateGoal,
  validateUpdateMilestone,
} from "./goal.validation.js";

export const createGoal = catchAsync(async (req, res) => {
  validateCreateGoal(req.body);
  const goal = await goalService.createGoal(req.user._id, req.body);

  return ApiResponse.success(res, {
    statusCode: httpStatus.CREATED,
    message: "Goal created successfully.",
    data: goal,
  });
});

export const getGoals = catchAsync(async (req, res) => {
  const query = validateGoalListQuery(req.query);
  const result = await goalService.getGoals(req.user._id, query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Goals fetched successfully.",
    data: result.items,
    meta: result.meta,
  });
});

export const getGoalById = catchAsync(async (req, res) => {
  validateGoalIdParam(req.params.id);
  const goal = await goalService.getGoalById(req.params.id, req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Goal fetched successfully.",
    data: goal,
  });
});

export const updateGoal = catchAsync(async (req, res) => {
  validateGoalIdParam(req.params.id);
  validateUpdateGoal(req.body);
  const goal = await goalService.updateGoal(req.params.id, req.user._id, req.body);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Goal updated successfully.",
    data: goal,
  });
});

export const deleteGoal = catchAsync(async (req, res) => {
  validateGoalIdParam(req.params.id);
  const goal = await goalService.deleteGoal(req.params.id, req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Goal deleted successfully.",
    data: goal,
  });
});

export const addMilestone = catchAsync(async (req, res) => {
  validateGoalIdParam(req.params.id);
  validateAddMilestone(req.body);
  const goal = await goalService.addMilestone(req.params.id, req.user._id, req.body);

  return ApiResponse.success(res, {
    statusCode: httpStatus.CREATED,
    message: "Milestone added successfully.",
    data: goal,
  });
});

export const updateMilestone = catchAsync(async (req, res) => {
  validateGoalIdParam(req.params.id);
  validateMilestoneIdParam(req.params.milestoneId);
  validateUpdateMilestone(req.body);
  const goal = await goalService.updateMilestone(
    req.params.id,
    req.params.milestoneId,
    req.user._id,
    req.body
  );

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Milestone updated successfully.",
    data: goal,
  });
});

export const deleteMilestone = catchAsync(async (req, res) => {
  validateGoalIdParam(req.params.id);
  validateMilestoneIdParam(req.params.milestoneId);
  const goal = await goalService.deleteMilestone(
    req.params.id,
    req.params.milestoneId,
    req.user._id
  );

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Milestone deleted successfully.",
    data: goal,
  });
});

export const recalculateProgress = catchAsync(async (req, res) => {
  validateGoalIdParam(req.params.id);
  const goal = await goalService.recalculateProgress(req.params.id, req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Goal progress recalculated successfully.",
    data: goal,
  });
});

export const archiveGoal = catchAsync(async (req, res) => {
  validateGoalIdParam(req.params.id);
  validateArchiveAction(req.body);
  const goal = await goalService.archiveGoal(req.params.id, req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Goal archived successfully.",
    data: goal,
  });
});

export const unarchiveGoal = catchAsync(async (req, res) => {
  validateGoalIdParam(req.params.id);
  validateArchiveAction(req.body);
  const goal = await goalService.unarchiveGoal(req.params.id, req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Goal unarchived successfully.",
    data: goal,
  });
});
