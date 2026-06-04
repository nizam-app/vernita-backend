import httpStatus from "../../../constants/httpStatus.js";
import ApiError from "../../../utils/api-error.js";
import { REFLECTION_MOODS } from "./reflection.model.js";
import { normalizeDateOnly } from "./reflection.utils.js";

const ensureString = (value, fieldName, required = false) => {
  if (value === undefined && !required) return;
  if (typeof value !== "string" || (required && !value.trim())) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a non-empty string.`);
  }
};

const ensureEnum = (value, fieldName, allowed) => {
  if (value === undefined || value === null || value === "") return;
  if (!allowed.includes(value)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be one of: ${allowed.join(", ")}.`);
  }
};

const ensureMongoId = (value, fieldName = "id") => {
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

const parseDate = (value, fieldName, required = false) => {
  if ((value === undefined || value === null || value === "") && !required) return undefined;
  const normalized = normalizeDateOnly(value);
  if (!normalized) throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a valid date.`);
  return normalized;
};

export const validateReflectionIdParam = (id) => ensureMongoId(id, "reflectionId");

export const validateDateParam = (date) => parseDate(date, "date", true);

export const validateCreateReflection = (body = {}) => {
  const allowedFields = ["entryDate", "reflectionText", "gratitudeText", "mood"];
  const invalidFields = Object.keys(body).filter((key) => !allowedFields.includes(key));
  if (invalidFields.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid fields: ${invalidFields.join(", ")}.`);
  }

  parseDate(body.entryDate, "entryDate", true);
  ensureString(body.reflectionText, "reflectionText", true);
  ensureString(body.gratitudeText, "gratitudeText");
  ensureEnum(body.mood, "mood", REFLECTION_MOODS);
};

export const validateUpdateReflection = (body = {}) => {
  const allowedFields = ["entryDate", "reflectionText", "gratitudeText", "mood"];
  const keys = Object.keys(body);
  if (keys.length === 0) throw new ApiError(httpStatus.BAD_REQUEST, "At least one field is required.");

  const invalidFields = keys.filter((key) => !allowedFields.includes(key));
  if (invalidFields.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid update fields: ${invalidFields.join(", ")}.`);
  }

  parseDate(body.entryDate, "entryDate");
  if (body.reflectionText !== undefined) ensureString(body.reflectionText, "reflectionText", true);
  ensureString(body.gratitudeText, "gratitudeText");
  ensureEnum(body.mood, "mood", REFLECTION_MOODS);
};

export const validateReflectionListQuery = (query = {}) => {
  const normalized = {};
  normalized.startDate = parseDate(query.startDate, "startDate");
  normalized.endDate = parseDate(query.endDate, "endDate");
  if (query.search !== undefined) normalized.search = String(query.search).trim();
  normalized.page = query.page ? ensurePositiveInteger(query.page, "page") : 1;
  normalized.limit = query.limit ? ensurePositiveInteger(query.limit, "limit") : 10;
  if (normalized.limit > 100) throw new ApiError(httpStatus.BAD_REQUEST, "limit cannot be greater than 100.");

  const sortOrder = query.sortOrder ? String(query.sortOrder).trim().toLowerCase() : "desc";
  if (!["asc", "desc", "1", "-1"].includes(sortOrder)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "sortOrder must be asc, desc, 1, or -1.");
  }
  normalized.sortOrder = sortOrder === "asc" || sortOrder === "1" ? 1 : -1;

  return normalized;
};
