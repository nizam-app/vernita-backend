import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../utils/api-error.js";
import {
  COURSE_ACCESS_TYPES,
  COURSE_LEVELS,
  COURSE_STATUSES,
} from "./course.model.js";
import { LESSON_RESOURCE_TYPES } from "./lesson.model.js";

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

const ensureNonNegativeNumber = (value, fieldName, required = false) => {
  if (value === undefined && !required) return;
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `${fieldName} must be a valid non-negative number.`
    );
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

const ensureStringArray = (value, fieldName) => {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be an array.`);
  }
  if (value.some((item) => typeof item !== "string")) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must contain strings only.`);
  }
};

const ensureResourceArray = (resources) => {
  if (resources === undefined) return;
  if (!Array.isArray(resources)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "resources must be an array.");
  }

  for (const resource of resources) {
    if (!resource || typeof resource !== "object" || Array.isArray(resource)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Each resource must be an object.");
    }
    ensureString(resource.title, "resource.title", true);
    ensureEnum(resource.type, "resource.type", LESSON_RESOURCE_TYPES, true);
    ensureString(resource.url, "resource.url", true);
  }
};

const ensurePositiveIntegerQuery = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a positive integer.`);
  }
  return parsed;
};

export const validateCourseIdParam = (id) => ensureMongoId(id, "courseId");
export const validateEnrollmentIdParam = (id) => ensureMongoId(id, "enrollmentId");
export const validateLessonIdParam = (id) => ensureMongoId(id, "lessonId");

export const validateCreateCourse = (body, { partial = false } = {}) => {
  ensureString(body.title, "title", true);
  ensureString(body.instructorName, "instructorName", true);
  ensureString(body.description, "description");
  if (partial) ensureString(body.bannerImage, "bannerImage");
  else ensureString(body.bannerImage, "bannerImage", true);
  ensureString(body.category, "category");
  ensureStringArray(body.tags, "tags");
  ensureString(body.instructorTitle, "instructorTitle");
  ensureString(body.instructorBio, "instructorBio");
  ensureEnum(body.level, "level", COURSE_LEVELS);
  ensureString(body.durationText, "durationText");
  ensureNonNegativeNumber(body.durationInWeeks, "durationInWeeks");
  ensureBoolean(body.certificateEnabled ?? false, "certificateEnabled");
  ensureEnum(body.accessType, "accessType", COURSE_ACCESS_TYPES);
  ensureNonNegativeNumber(body.price, "price");
  ensureString(body.currency, "currency");
  if (body.isFeatured !== undefined) ensureBoolean(body.isFeatured, "isFeatured");
  if (body.isPublished !== undefined) ensureBoolean(body.isPublished, "isPublished");
  ensureEnum(body.status, "status", COURSE_STATUSES);
};

export const validateUpdateCourse = (body) => {
  const allowedFields = [
    "title",
    "description",
    "bannerImage",
    "category",
    "tags",
    "instructorName",
    "instructorTitle",
    "instructorBio",
    "level",
    "durationText",
    "durationInWeeks",
    "rating",
    "reviewsCount",
    "certificateEnabled",
    "accessType",
    "price",
    "currency",
    "isFeatured",
    "isPublished",
    "status",
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

  validateCreateCourse({ ...body, title: body.title ?? "placeholder", instructorName: body.instructorName ?? "placeholder" }, { partial: true });
};

export const validateToggleBody = (body, fieldName) => {
  if (body?.[fieldName] === undefined) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} is required.`);
  }
  ensureBoolean(body[fieldName], fieldName);
};

export const validateCreateLesson = (body) => {
  ensureString(body.title, "title", true);
  ensureString(body.summary, "summary");
  ensureString(body.videoUrl, "videoUrl", true);
  ensureString(body.videoDurationText, "videoDurationText");
  ensureNonNegativeNumber(body.videoDurationSeconds, "videoDurationSeconds");
  ensureNonNegativeNumber(body.sortOrder, "sortOrder", true);
  if (!Number.isInteger(body.sortOrder)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "sortOrder must be an integer.");
  }
  if (body.isPreview !== undefined) ensureBoolean(body.isPreview, "isPreview");
  if (body.isPublished !== undefined) ensureBoolean(body.isPublished, "isPublished");
  ensureResourceArray(body.resources);
};

export const validateUpdateLesson = (body) => {
  const allowedFields = [
    "title",
    "summary",
    "videoUrl",
    "videoDurationText",
    "videoDurationSeconds",
    "resources",
    "sortOrder",
    "isPreview",
    "isPublished",
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
  if (body.title !== undefined) ensureString(body.title, "title", true);
  ensureString(body.summary, "summary");
  ensureString(body.videoUrl, "videoUrl");
  ensureString(body.videoDurationText, "videoDurationText");
  ensureNonNegativeNumber(body.videoDurationSeconds, "videoDurationSeconds");
  if (body.sortOrder !== undefined && !Number.isInteger(body.sortOrder)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "sortOrder must be an integer.");
  }
  if (body.isPreview !== undefined) ensureBoolean(body.isPreview, "isPreview");
  if (body.isPublished !== undefined) ensureBoolean(body.isPublished, "isPublished");
  ensureResourceArray(body.resources);
};

export const validateReorderLessons = (body) => {
  if (!Array.isArray(body?.lessons) || body.lessons.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "lessons must be a non-empty array.");
  }
  for (const lesson of body.lessons) {
    ensureMongoId(lesson.id, "lesson.id");
    if (!Number.isInteger(lesson.sortOrder) || lesson.sortOrder < 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, "lesson.sortOrder must be a non-negative integer.");
    }
  }
};

export const validateCourseListQuery = (query, { admin = false } = {}) => {
  const normalized = {};

  if (query.category !== undefined) normalized.category = String(query.category).trim();
  if (query.accessType !== undefined) {
    ensureEnum(String(query.accessType), "accessType", COURSE_ACCESS_TYPES, true);
    normalized.accessType = String(query.accessType);
  }
  if (query.level !== undefined) {
    ensureEnum(String(query.level), "level", COURSE_LEVELS, true);
    normalized.level = String(query.level);
  }
  if (query.search !== undefined) normalized.search = String(query.search).trim();
  if (admin && query.status !== undefined) {
    ensureEnum(String(query.status), "status", COURSE_STATUSES, true);
    normalized.status = String(query.status);
  }
  for (const key of ["isPublished", "isFeatured", "featured", "freeOnly"]) {
    if (query[key] !== undefined) {
      if (!["true", "false"].includes(String(query[key]))) {
        throw new ApiError(httpStatus.BAD_REQUEST, `${key} must be true or false.`);
      }
      normalized[key] = String(query[key]) === "true";
    }
  }

  normalized.page = query.page ? ensurePositiveIntegerQuery(query.page, "page") : 1;
  normalized.limit = query.limit ? ensurePositiveIntegerQuery(query.limit, "limit") : 10;
  if (normalized.limit > 100) {
    throw new ApiError(httpStatus.BAD_REQUEST, "limit cannot be greater than 100.");
  }

  const allowedSortFields = [
    "createdAt",
    "title",
    "price",
    "rating",
    "studentCount",
    "lessonsCount",
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

export const validateEnrollRequest = () => true;

export const validateLessonProgress = (body) => {
  ensureNonNegativeNumber(body.watchedSeconds, "watchedSeconds", true);
};

export const validateLessonComplete = () => true;

export const validatePaymentCompletion = (body) => {
  const normalized = {};

  if (body?.paymentReference !== undefined) {
    ensureString(body.paymentReference, "paymentReference", true);
    normalized.paymentReference = body.paymentReference.trim();
  }

  if (body?.paymentProvider !== undefined) {
    ensureString(body.paymentProvider, "paymentProvider", true);
    normalized.paymentProvider = body.paymentProvider.trim();
  }

  return normalized;
};
