import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../utils/api-error.js";
import { TASK_PRIORITIES, TASK_TYPES } from "./task.model.js";

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

const ensureEnum = (value, fieldName, allowed, required = false) => {
  if (value === undefined && !required) return;
  if (!allowed.includes(value)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `${fieldName} must be one of: ${allowed.join(", ")}.`
    );
  }
};

const ensureDate = (value, fieldName) => {
  if (value === undefined || value === null || value === "") return;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a valid date.`);
  }
};

const ensurePositiveInteger = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a positive integer.`);
  }
  return parsed;
};

export const validateTaskIdParam = (id) => ensureMongoId(id, "taskId");

export const validateCreateTask = (body) => {
  ensureString(body.title, "title", true);
  ensureEnum(body.type, "type", TASK_TYPES);
  ensureEnum(body.priority, "priority", TASK_PRIORITIES);
  ensureDate(body.dueDate, "dueDate");
  if (body.completed !== undefined) ensureBoolean(body.completed, "completed");
  ensureString(body.notes, "notes");
};

export const validateUpdateTask = (body) => {
  const allowedFields = ["title", "type", "priority", "dueDate", "completed", "notes"];
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
  ensureEnum(body.type, "type", TASK_TYPES);
  ensureEnum(body.priority, "priority", TASK_PRIORITIES);
  ensureDate(body.dueDate, "dueDate");
  if (body.completed !== undefined) ensureBoolean(body.completed, "completed");
  ensureString(body.notes, "notes");
};

export const validateCompleteTask = (body) => {
  if (body?.completed === undefined) return { completed: true };
  ensureBoolean(body.completed, "completed");
  return { completed: body.completed };
};

export const validateTaskListQuery = (query) => {
  const normalized = {};

  if (query.filter !== undefined) {
    const filter = String(query.filter).trim();
    if (!["all", "today", "upcoming", "completed"].includes(filter)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "filter must be one of: all, today, upcoming, completed."
      );
    }
    normalized.filter = filter;
  } else {
    normalized.filter = "all";
  }

  if (query.type !== undefined) {
    normalized.type = String(query.type).trim();
    ensureEnum(normalized.type, "type", TASK_TYPES, true);
  }

  if (query.priority !== undefined) {
    normalized.priority = String(query.priority).trim();
    ensureEnum(normalized.priority, "priority", TASK_PRIORITIES, true);
  }

  if (query.completed !== undefined) {
    if (!["true", "false"].includes(String(query.completed))) {
      throw new ApiError(httpStatus.BAD_REQUEST, "completed must be true or false.");
    }
    normalized.completed = String(query.completed) === "true";
  }

  if (query.search !== undefined) normalized.search = String(query.search).trim();

  normalized.page = query.page ? ensurePositiveInteger(query.page, "page") : 1;
  normalized.limit = query.limit ? ensurePositiveInteger(query.limit, "limit") : 10;
  if (normalized.limit > 100) {
    throw new ApiError(httpStatus.BAD_REQUEST, "limit cannot be greater than 100.");
  }

  const allowedSortFields = ["createdAt", "updatedAt", "dueDate", "title", "priority", "completed"];
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
