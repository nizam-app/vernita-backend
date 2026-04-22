import httpStatus from "../../../constants/httpStatus.js";
import ApiError from "../../../utils/api-error.js";
import { SELF_CARE_MOODS } from "./selfCare.model.js";
import { normalizeDateOnly } from "./selfCare.utils.js";

const ensureNumber = (value, fieldName, { min, max, integer = false } = {}) => {
  if (value === undefined) return;
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a valid number.`);
  }
  if (integer && !Number.isInteger(value)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be an integer.`);
  }
  if (min !== undefined && value < min) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be at least ${min}.`);
  }
  if (max !== undefined && value > max) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} cannot be greater than ${max}.`);
  }
};

const ensureBoolean = (value, fieldName) => {
  if (value === undefined) return;
  if (typeof value !== "boolean") {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a boolean.`);
  }
};

const ensureString = (value, fieldName) => {
  if (value === undefined) return;
  if (typeof value !== "string") {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a string.`);
  }
};

const ensureMood = (value) => {
  if (value === undefined || value === null) return;
  if (!SELF_CARE_MOODS.includes(value)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `mood must be one of: ${SELF_CARE_MOODS.join(", ")}.`
    );
  }
};

const rejectEntryDate = (body) => {
  if (body.entryDate !== undefined) {
    throw new ApiError(httpStatus.BAD_REQUEST, "entryDate is not allowed for today routes.");
  }
};

const validatePayloadFields = (body) => {
  ensureNumber(body.hydrationGlasses, "hydrationGlasses", { min: 0, max: 8 });
  ensureNumber(body.hydrationGoal, "hydrationGoal", { min: 1, max: 20 });
  ensureNumber(body.sleepHours, "sleepHours", { min: 0, max: 24 });
  ensureMood(body.mood);
  ensureBoolean(body.meditationDone, "meditationDone");
  ensureNumber(body.stressLevel, "stressLevel", { min: 1, max: 10, integer: true });
  ensureString(body.notes, "notes");
};

export const validateTodayUpsert = (body) => {
  rejectEntryDate(body);
  validatePayloadFields(body);
};

export const validateTodayPatch = (body) => {
  rejectEntryDate(body);
  const keys = Object.keys(body || {});
  if (keys.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "At least one field is required.");
  }

  const allowedFields = [
    "hydrationGlasses",
    "hydrationGoal",
    "sleepHours",
    "mood",
    "meditationDone",
    "stressLevel",
    "notes",
  ];
  const invalidFields = keys.filter((key) => !allowedFields.includes(key));
  if (invalidFields.length > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid fields: ${invalidFields.join(", ")}.`
    );
  }

  validatePayloadFields(body);
};

export const validateSelfCareIdParam = (id) => {
  if (!id || typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "selfCareEntryId must be a valid id.");
  }
};

const validateDateQuery = (value, fieldName) => {
  if (value === undefined) return undefined;
  const normalized = normalizeDateOnly(value);
  if (!normalized) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a valid date.`);
  }
  return normalized;
};

const ensurePositiveInteger = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a positive integer.`);
  }
  return parsed;
};

export const validateHistoryQuery = (query) => {
  const normalized = {
    startDate: validateDateQuery(query.startDate, "startDate"),
    endDate: validateDateQuery(query.endDate, "endDate"),
    page: query.page ? ensurePositiveInteger(query.page, "page") : 1,
    limit: query.limit ? ensurePositiveInteger(query.limit, "limit") : 10,
  };

  if (normalized.limit > 100) {
    throw new ApiError(httpStatus.BAD_REQUEST, "limit cannot be greater than 100.");
  }

  const sortOrder = query.sortOrder ? String(query.sortOrder).toLowerCase() : "desc";
  if (!["asc", "desc", "1", "-1"].includes(sortOrder)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "sortOrder must be asc, desc, 1, or -1.");
  }
  normalized.sortOrder = sortOrder === "asc" || sortOrder === "1" ? 1 : -1;

  return normalized;
};

export const validateStatsQuery = (query) => ({
  startDate: validateDateQuery(query.startDate, "startDate"),
  endDate: validateDateQuery(query.endDate, "endDate"),
});
