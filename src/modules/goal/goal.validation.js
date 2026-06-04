import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../utils/api-error.js";
import { GOAL_STATUSES } from "./goal.model.js";

const ensureMongoId = (value, fieldName) => {
  if (!value || typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a valid id.`);
  }
};

const ensureString = (value, fieldName, required = false) => {
  if (value === undefined && !required) return;
  if (typeof value !== "string" || (required && !value.trim())) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a non-empty string.`);
  }
};

const ensureBoolean = (value, fieldName) => {
  if (typeof value !== "boolean") {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a boolean.`);
  }
};

const ensureValidDate = (value, fieldName) => {
  if (value === undefined || value === null || value === "") return;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a valid date.`);
  }
};

const ensureStatus = (value) => {
  if (!GOAL_STATUSES.includes(value)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `status must be one of: ${GOAL_STATUSES.join(", ")}.`
    );
  }
};

const ensurePositiveIntegerQuery = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a positive integer.`);
  }

  return parsed;
};

const validateMilestones = (milestones) => {
  if (milestones === undefined) return;
  if (!Array.isArray(milestones)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "milestones must be an array.");
  }

  for (const milestone of milestones) {
    if (!milestone || typeof milestone !== "object" || Array.isArray(milestone)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Each milestone must be an object.");
    }
    ensureString(milestone.title, "milestone.title", true);
    if (milestone.completed !== undefined) {
      ensureBoolean(milestone.completed, "milestone.completed");
    }
  }
};

export const validateGoalIdParam = (id) => ensureMongoId(id, "goalId");
export const validateMilestoneIdParam = (id) => ensureMongoId(id, "milestoneId");

export const validateCreateGoal = (body) => {
  ensureString(body.title, "title", true);
  ensureString(body.category, "category", true);
  ensureString(body.description, "description");
  ensureValidDate(body.deadline, "deadline");
  if (body.status !== undefined) ensureStatus(body.status);
  validateMilestones(body.milestones);
};

export const validateUpdateGoal = (body) => {
  const allowedFields = ["title", "category", "deadline", "description", "status", "milestones"];
  const keys = Object.keys(body || {});

  if (keys.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "At least one field is required.");
  }

  const invalidFields = keys.filter((key) => !allowedFields.includes(key));
  if (invalidFields.length > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid update fields: ${invalidFields.join(", ")}.`
    );
  }

  if (body.title !== undefined) ensureString(body.title, "title", true);
  if (body.category !== undefined) ensureString(body.category, "category", true);
  ensureString(body.description, "description");
  ensureValidDate(body.deadline, "deadline");
  if (body.status !== undefined) ensureStatus(body.status);
  validateMilestones(body.milestones);
};

export const validateAddMilestone = (body) => {
  ensureString(body.title, "title", true);
  if (body.completed !== undefined) ensureBoolean(body.completed, "completed");
};

export const validateUpdateMilestone = (body) => {
  const allowedFields = ["title", "completed"];
  const keys = Object.keys(body || {});

  if (keys.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "At least one field is required.");
  }

  const invalidFields = keys.filter((key) => !allowedFields.includes(key));
  if (invalidFields.length > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid update fields: ${invalidFields.join(", ")}.`
    );
  }

  if (body.title !== undefined) ensureString(body.title, "title", true);
  if (body.completed !== undefined) ensureBoolean(body.completed, "completed");
};

export const validateArchiveAction = () => true;

export const validateGoalListQuery = (query) => {
  const normalized = {};

  if (query.category !== undefined) normalized.category = String(query.category).trim();
  if (query.status !== undefined) {
    const status = String(query.status).trim();
    ensureStatus(status);
    normalized.status = status;
  }
  if (query.search !== undefined) normalized.search = String(query.search).trim();
  if (query.deadlineFrom !== undefined) {
    ensureValidDate(query.deadlineFrom, "deadlineFrom");
    normalized.deadlineFrom = new Date(query.deadlineFrom);
  }
  if (query.deadlineTo !== undefined) {
    ensureValidDate(query.deadlineTo, "deadlineTo");
    normalized.deadlineTo = new Date(query.deadlineTo);
  }

  normalized.page = query.page ? ensurePositiveIntegerQuery(query.page, "page") : 1;
  normalized.limit = query.limit ? ensurePositiveIntegerQuery(query.limit, "limit") : 10;
  if (normalized.limit > 100) {
    throw new ApiError(httpStatus.BAD_REQUEST, "limit cannot be greater than 100.");
  }

  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "deadline",
    "title",
    "category",
    "status",
    "progressPercent",
  ];
  normalized.sortBy = query.sortBy ? String(query.sortBy).trim() : "createdAt";
  if (!allowedSortFields.includes(normalized.sortBy)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `sortBy must be one of: ${allowedSortFields.join(", ")}.`
    );
  }

  const sortOrder = query.sortOrder ? String(query.sortOrder).trim().toLowerCase() : "desc";
  if (!["asc", "desc", "1", "-1"].includes(sortOrder)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "sortOrder must be asc, desc, 1, or -1.");
  }
  normalized.sortOrder = sortOrder === "asc" || sortOrder === "1" ? 1 : -1;

  return normalized;
};
