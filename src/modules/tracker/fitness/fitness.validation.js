import httpStatus from "../../../constants/httpStatus.js";
import ApiError from "../../../utils/api-error.js";

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

export const validateFitnessIdParam = (id) => ensureMongoId(id, "fitnessEntryId");

export const validateCreateFitnessEntry = (body) => {
  ensureString(body.workoutType, "workoutType", true);
  ensureNumber(body.durationMinutes, "durationMinutes", { min: 1, required: true });
  ensureNumber(body.caloriesBurned, "caloriesBurned", { min: 0 });
  ensureDate(body.workoutDate, "workoutDate", true);
  ensureString(body.notes, "notes");
};

export const validateUpdateFitnessEntry = (body) => {
  const allowedFields = [
    "workoutType",
    "durationMinutes",
    "caloriesBurned",
    "workoutDate",
    "notes",
  ];
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

  if (body.workoutType !== undefined) ensureString(body.workoutType, "workoutType", true);
  ensureNumber(body.durationMinutes, "durationMinutes", { min: 1 });
  ensureNumber(body.caloriesBurned, "caloriesBurned", { min: 0 });
  ensureDate(body.workoutDate, "workoutDate");
  ensureString(body.notes, "notes");
};

export const validateFitnessListQuery = (query) => {
  const normalized = {};

  if (query.workoutType !== undefined) normalized.workoutType = String(query.workoutType).trim();
  if (query.search !== undefined) normalized.search = String(query.search).trim();
  normalized.startDate = parseDateQuery(query.startDate, "startDate");
  normalized.endDate = parseDateQuery(query.endDate, "endDate");
  normalized.page = query.page ? ensurePositiveInteger(query.page, "page") : 1;
  normalized.limit = query.limit ? ensurePositiveInteger(query.limit, "limit") : 10;
  if (normalized.limit > 100) {
    throw new ApiError(httpStatus.BAD_REQUEST, "limit cannot be greater than 100.");
  }

  const allowedSortFields = ["createdAt", "updatedAt", "workoutDate", "workoutType", "durationMinutes", "caloriesBurned"];
  normalized.sortBy = query.sortBy ? String(query.sortBy).trim() : "workoutDate";
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

export const validateWeeklyStatsQuery = (query) => ({
  startDate: parseDateQuery(query.startDate, "startDate"),
  endDate: parseDateQuery(query.endDate, "endDate"),
});

export const validateRecentActivityQuery = (query) => {
  const limit = query.limit ? ensurePositiveInteger(query.limit, "limit") : 10;
  if (limit > 50) {
    throw new ApiError(httpStatus.BAD_REQUEST, "limit cannot be greater than 50.");
  }
  return { limit };
};
