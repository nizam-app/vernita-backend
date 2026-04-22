import httpStatus from "../../../constants/httpStatus.js";
import ApiError from "../../../utils/api-error.js";
import { FINANCE_TRANSACTION_TYPES } from "./financeTransaction.model.js";
import { SAVINGS_GOAL_STATUSES } from "./savingsGoal.model.js";

const ensureString = (value, fieldName, required = false) => {
  if (value === undefined && !required) return;
  if (typeof value !== "string" || (required && !value.trim())) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a non-empty string.`);
  }
};

const ensureNumber = (value, fieldName, { min, required = false } = {}) => {
  if (value === undefined && !required) return;
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a valid number.`);
  }
  if (min !== undefined && value < min) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be at least ${min}.`);
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

const ensureDate = (value, fieldName, required = false) => {
  if ((value === undefined || value === null || value === "") && !required) return;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a valid date.`);
  }
};

const ensureMongoId = (value, fieldName) => {
  if (!value || typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a valid id.`);
  }
};

const ensurePositiveInteger = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a positive integer.`);
  }
  return parsed;
};

const parseDateQuery = (value, fieldName) => {
  if (value === undefined) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a valid date.`);
  }
  return date;
};

export const validateTransactionIdParam = (id) => ensureMongoId(id, "transactionId");
export const validateSavingsGoalIdParam = (id) => ensureMongoId(id, "savingsGoalId");

export const validateCreateTransaction = (body) => {
  ensureEnum(body.type, "type", FINANCE_TRANSACTION_TYPES, true);
  ensureString(body.description, "description", true);
  ensureNumber(body.amount, "amount", { min: 0.01, required: true });
  ensureString(body.category, "category", true);
  ensureDate(body.transactionDate, "transactionDate", true);
  ensureString(body.notes, "notes");
};

export const validateUpdateTransaction = (body) => {
  const allowedFields = ["type", "description", "amount", "category", "transactionDate", "notes"];
  const keys = Object.keys(body || {});
  if (keys.length === 0) throw new ApiError(httpStatus.BAD_REQUEST, "At least one field is required.");
  const invalidFields = keys.filter((key) => !allowedFields.includes(key));
  if (invalidFields.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid update fields: ${invalidFields.join(", ")}.`);
  }
  ensureEnum(body.type, "type", FINANCE_TRANSACTION_TYPES);
  if (body.description !== undefined) ensureString(body.description, "description", true);
  ensureNumber(body.amount, "amount", { min: 0.01 });
  if (body.category !== undefined) ensureString(body.category, "category", true);
  ensureDate(body.transactionDate, "transactionDate");
  ensureString(body.notes, "notes");
};

export const validateTransactionListQuery = (query) => {
  const normalized = {};
  if (query.type !== undefined) {
    normalized.type = String(query.type).trim();
    ensureEnum(normalized.type, "type", FINANCE_TRANSACTION_TYPES, true);
  }
  if (query.category !== undefined) normalized.category = String(query.category).trim();
  if (query.search !== undefined) normalized.search = String(query.search).trim();
  normalized.startDate = parseDateQuery(query.startDate, "startDate");
  normalized.endDate = parseDateQuery(query.endDate, "endDate");
  normalized.page = query.page ? ensurePositiveInteger(query.page, "page") : 1;
  normalized.limit = query.limit ? ensurePositiveInteger(query.limit, "limit") : 10;
  if (normalized.limit > 100) throw new ApiError(httpStatus.BAD_REQUEST, "limit cannot be greater than 100.");
  const allowedSortFields = ["createdAt", "updatedAt", "transactionDate", "amount", "category", "type"];
  normalized.sortBy = query.sortBy ? String(query.sortBy).trim() : "transactionDate";
  if (!allowedSortFields.includes(normalized.sortBy)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `sortBy must be one of: ${allowedSortFields.join(", ")}.`);
  }
  const sortOrder = query.sortOrder ? String(query.sortOrder).trim().toLowerCase() : "desc";
  if (!["asc", "desc", "1", "-1"].includes(sortOrder)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "sortOrder must be asc, desc, 1, or -1.");
  }
  normalized.sortOrder = sortOrder === "asc" || sortOrder === "1" ? 1 : -1;
  return normalized;
};

export const validateRecentQuery = (query) => {
  const limit = query.limit ? ensurePositiveInteger(query.limit, "limit") : 5;
  if (limit > 50) throw new ApiError(httpStatus.BAD_REQUEST, "limit cannot be greater than 50.");
  return { limit };
};

export const validateRangeQuery = (query) => ({
  startDate: parseDateQuery(query.startDate, "startDate"),
  endDate: parseDateQuery(query.endDate, "endDate"),
});

export const validateCreateSavingsGoal = (body) => {
  ensureString(body.title, "title", true);
  ensureNumber(body.targetAmount, "targetAmount", { min: 0.01, required: true });
  ensureNumber(body.currentAmount, "currentAmount", { min: 0 });
  ensureDate(body.targetDate, "targetDate");
  ensureEnum(body.status, "status", SAVINGS_GOAL_STATUSES);
};

export const validateUpdateSavingsGoal = (body) => {
  const allowedFields = ["title", "targetAmount", "currentAmount", "targetDate", "status"];
  const keys = Object.keys(body || {});
  if (keys.length === 0) throw new ApiError(httpStatus.BAD_REQUEST, "At least one field is required.");
  const invalidFields = keys.filter((key) => !allowedFields.includes(key));
  if (invalidFields.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid update fields: ${invalidFields.join(", ")}.`);
  }
  if (body.title !== undefined) ensureString(body.title, "title", true);
  ensureNumber(body.targetAmount, "targetAmount", { min: 0.01 });
  ensureNumber(body.currentAmount, "currentAmount", { min: 0 });
  ensureDate(body.targetDate, "targetDate");
  ensureEnum(body.status, "status", SAVINGS_GOAL_STATUSES);
};

export const validateSavingsGoalProgress = (body) => {
  ensureNumber(body.currentAmount, "currentAmount", { min: 0, required: true });
};

export const validateSavingsGoalListQuery = (query) => {
  const normalized = {};
  if (query.status !== undefined) {
    normalized.status = String(query.status).trim();
    ensureEnum(normalized.status, "status", SAVINGS_GOAL_STATUSES, true);
  }
  normalized.page = query.page ? ensurePositiveInteger(query.page, "page") : 1;
  normalized.limit = query.limit ? ensurePositiveInteger(query.limit, "limit") : 10;
  if (normalized.limit > 100) throw new ApiError(httpStatus.BAD_REQUEST, "limit cannot be greater than 100.");
  return normalized;
};

export const validateBudgetUpdate = (body) => {
  const allowedFields = ["monthlyBudget", "currency"];
  const keys = Object.keys(body || {});
  if (keys.length === 0) throw new ApiError(httpStatus.BAD_REQUEST, "At least one field is required.");
  const invalidFields = keys.filter((key) => !allowedFields.includes(key));
  if (invalidFields.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid update fields: ${invalidFields.join(", ")}.`);
  }
  ensureNumber(body.monthlyBudget, "monthlyBudget", { min: 0 });
  ensureString(body.currency, "currency");
};
