import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../utils/api-error.js";
import { WEBINAR_STATUSES } from "./webinar.model.js";

const ensureMongoId = (value, fieldName) => {
  if (!value || typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a valid id.`);
  }
};

const ensureNonEmptyString = (value, fieldName) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} is required.`);
  }
};

const ensureNonNegativeNumber = (value, fieldName) => {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `${fieldName} must be a valid non-negative number.`
    );
  }
};

const ensureBoolean = (value, fieldName) => {
  if (typeof value !== "boolean") {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a boolean.`);
  }
};

const ensureSpeaker = (speaker) => {
  if (!speaker || typeof speaker !== "object" || Array.isArray(speaker)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "speaker information is required.");
  }

  ensureNonEmptyString(speaker.name, "speaker.name");

  if (speaker.title !== undefined && (typeof speaker.title !== "string" || !speaker.title.trim())) {
    throw new ApiError(httpStatus.BAD_REQUEST, "speaker.title must be a non-empty string.");
  }

  if (speaker.bio !== undefined && typeof speaker.bio !== "string") {
    throw new ApiError(httpStatus.BAD_REQUEST, "speaker.bio must be a string.");
  }

  if (speaker.imageUrl !== undefined && typeof speaker.imageUrl !== "string") {
    throw new ApiError(httpStatus.BAD_REQUEST, "speaker.imageUrl must be a string.");
  }
};

const ensureDate = (value, fieldName) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a valid date.`);
  }
};

const ensureStatus = (status) => {
  if (!WEBINAR_STATUSES.includes(status)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `status must be one of: ${WEBINAR_STATUSES.join(", ")}.`
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

export const validateCreateWebinar = (body) => {
  ensureNonEmptyString(body.title, "title");
  ensureNonEmptyString(body.description, "description");
  ensureNonEmptyString(body.category, "category");
  ensureSpeaker(body.speaker);
  ensureDate(body.scheduledAt, "scheduledAt");

  if (body.durationMinutes !== undefined) {
    ensureNonNegativeNumber(body.durationMinutes, "durationMinutes");
    if (body.durationMinutes < 1) {
      throw new ApiError(httpStatus.BAD_REQUEST, "durationMinutes must be at least 1.");
    }
  }

  if (body.price !== undefined) {
    ensureNonNegativeNumber(body.price, "price");
  }

  if (body.isPaid !== undefined) {
    ensureBoolean(body.isPaid, "isPaid");
  }

  if (body.status !== undefined) {
    ensureStatus(body.status);
  }

  if (body.maxSeats !== undefined) {
    ensureNonNegativeNumber(body.maxSeats, "maxSeats");
    if (body.maxSeats < 1) {
      throw new ApiError(httpStatus.BAD_REQUEST, "maxSeats must be at least 1.");
    }
  }

  if (body.tags !== undefined && !Array.isArray(body.tags)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "tags must be an array.");
  }
};

export const validateUpdateWebinar = (body) => {
  const allowedFields = [
    "title",
    "description",
    "category",
    "speaker",
    "scheduledAt",
    "durationMinutes",
    "timezone",
    "price",
    "currency",
    "isPaid",
    "status",
    "joinLink",
    "coverImageUrl",
    "tags",
    "maxSeats",
  ];

  const keys = Object.keys(body || {});
  if (keys.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "At least one field is required for update.");
  }

  const invalidFields = keys.filter((key) => !allowedFields.includes(key));
  if (invalidFields.length > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid update fields: ${invalidFields.join(", ")}.`
    );
  }

  if (body.title !== undefined) ensureNonEmptyString(body.title, "title");
  if (body.description !== undefined) ensureNonEmptyString(body.description, "description");
  if (body.category !== undefined) ensureNonEmptyString(body.category, "category");
  if (body.speaker !== undefined) ensureSpeaker(body.speaker);
  if (body.scheduledAt !== undefined) ensureDate(body.scheduledAt, "scheduledAt");
  if (body.durationMinutes !== undefined) {
    ensureNonNegativeNumber(body.durationMinutes, "durationMinutes");
    if (body.durationMinutes < 1) {
      throw new ApiError(httpStatus.BAD_REQUEST, "durationMinutes must be at least 1.");
    }
  }
  if (body.price !== undefined) ensureNonNegativeNumber(body.price, "price");
  if (body.isPaid !== undefined) ensureBoolean(body.isPaid, "isPaid");
  if (body.status !== undefined) ensureStatus(body.status);
  if (body.maxSeats !== undefined) {
    ensureNonNegativeNumber(body.maxSeats, "maxSeats");
    if (body.maxSeats < 1) {
      throw new ApiError(httpStatus.BAD_REQUEST, "maxSeats must be at least 1.");
    }
  }
  if (body.tags !== undefined && !Array.isArray(body.tags)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "tags must be an array.");
  }
};

export const validatePublishWebinar = (body) => {
  if (body?.isPublished === undefined) {
    throw new ApiError(httpStatus.BAD_REQUEST, "isPublished is required.");
  }

  ensureBoolean(body.isPublished, "isPublished");
};

export const validateWebinarStatusUpdate = (body) => {
  if (!body?.status) {
    throw new ApiError(httpStatus.BAD_REQUEST, "status is required.");
  }

  ensureStatus(body.status);
};

export const validateWebinarIdParam = (id) => {
  ensureMongoId(id, "webinarId");
};

export const validateRegistrationIdParam = (id) => {
  ensureMongoId(id, "registrationId");
};

export const validateWebinarListQuery = (query) => {
  const normalized = {};

  if (query.status !== undefined) {
    ensureStatus(String(query.status).trim());
    normalized.status = String(query.status).trim();
  }

  if (query.category !== undefined) {
    normalized.category = String(query.category).trim();
  }

  if (query.search !== undefined) {
    normalized.search = String(query.search).trim();
  }

  if (query.isPublished !== undefined) {
    if (!["true", "false"].includes(String(query.isPublished))) {
      throw new ApiError(httpStatus.BAD_REQUEST, "isPublished must be true or false.");
    }

    normalized.isPublished = String(query.isPublished) === "true";
  }

  if (query.page !== undefined) {
    normalized.page = ensurePositiveIntegerQuery(query.page, "page");
  } else {
    normalized.page = 1;
  }

  if (query.limit !== undefined) {
    normalized.limit = ensurePositiveIntegerQuery(query.limit, "limit");
  } else {
    normalized.limit = 10;
  }

  if (normalized.limit > 100) {
    throw new ApiError(httpStatus.BAD_REQUEST, "limit cannot be greater than 100.");
  }

  if (query.sortBy !== undefined) {
    const sortBy = String(query.sortBy).trim();
    const allowedSortFields = ["scheduledAt", "createdAt", "price", "title", "registeredCount"];
    if (!allowedSortFields.includes(sortBy)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `sortBy must be one of: ${allowedSortFields.join(", ")}.`
      );
    }
    normalized.sortBy = sortBy;
  } else {
    normalized.sortBy = "scheduledAt";
  }

  if (query.sortOrder !== undefined) {
    const sortOrder = String(query.sortOrder).trim().toLowerCase();
    if (!["asc", "desc", "1", "-1"].includes(sortOrder)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "sortOrder must be asc, desc, 1, or -1.");
    }
    normalized.sortOrder = sortOrder === "desc" || sortOrder === "-1" ? -1 : 1;
  } else {
    normalized.sortOrder = 1;
  }

  return normalized;
};

export const validatePaymentCompletion = (body) => {
  const normalized = {};

  if (body.paymentReference !== undefined) {
    if (typeof body.paymentReference !== "string" || !body.paymentReference.trim()) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "paymentReference must be a non-empty string."
      );
    }
    normalized.paymentReference = body.paymentReference.trim();
  }

  if (body.paymentProvider !== undefined) {
    if (typeof body.paymentProvider !== "string" || !body.paymentProvider.trim()) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "paymentProvider must be a non-empty string."
      );
    }
    normalized.paymentProvider = body.paymentProvider.trim();
  }

  return normalized;
};
