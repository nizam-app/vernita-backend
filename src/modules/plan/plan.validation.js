import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../utils/api-error.js";
import { BILLING_CYCLES } from "./plan.model.js";

const ALLOWED_SORT_FIELDS = ["name", "price", "billingCycle", "sortOrder", "createdAt", "updatedAt"];
const ALLOWED_UPDATE_FIELDS = [
  "name",
  "description",
  "price",
  "currency",
  "billingCycle",
  "features",
  "webinarDiscountPercent",
  "recommended",
  "isActive",
  "sortOrder",
];

const ensureStringArray = (value, fieldName) => {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be an array.`);
  }

  const hasInvalidItem = value.some(
    (item) => typeof item !== 'string' || !item.trim()
  );

  if (hasInvalidItem) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `${fieldName} must contain only non-empty text values.`
    );
  }
};

const ensureBoolean = (value, fieldName) => {
  if (typeof value !== 'boolean') {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a boolean.`);
  }
};

const ensureNonNegativeNumber = (value, fieldName) => {
  if (value === undefined) {
    return;
  }

  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a valid number.`);
  }

  if (value < 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} cannot be negative.`);
  }
};

const ensureBillingCycle = (value) => {
  if (value === undefined) {
    return;
  }

  if (!BILLING_CYCLES.includes(value)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `billingCycle must be one of: ${BILLING_CYCLES.join(', ')}.`
    );
  }
};

const validateCreatePlan = (body) => {
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Plan name is required.');
  }

  if (body.price === undefined) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Plan price is required.');
  }

  ensureNonNegativeNumber(body.price, 'Price');
  ensureNonNegativeNumber(body.webinarDiscountPercent, 'webinarDiscountPercent');
  ensureBillingCycle(body.billingCycle);
  ensureStringArray(body.features, 'features');
};

const validateUpdatePlan = (body) => {
  const keys = Object.keys(body || {});

  if (keys.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'At least one field is required for update.');
  }

  const invalidFields = keys.filter((key) => !ALLOWED_UPDATE_FIELDS.includes(key));

  if (invalidFields.length > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid update fields: ${invalidFields.join(', ')}.`
    );
  }

  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Plan name must be a non-empty string.');
  }

  ensureNonNegativeNumber(body.price, 'Price');
  ensureNonNegativeNumber(body.webinarDiscountPercent, 'webinarDiscountPercent');
  ensureBillingCycle(body.billingCycle);
  ensureStringArray(body.features, 'features');

  if (body.currency !== undefined && (typeof body.currency !== 'string' || !body.currency.trim())) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Currency must be a non-empty string.');
  }

  if (body.sortOrder !== undefined && !Number.isInteger(body.sortOrder)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "sortOrder must be an integer.");
  }

  if (body.recommended !== undefined) {
    ensureBoolean(body.recommended, 'recommended');
  }

  if (body.isActive !== undefined) {
    ensureBoolean(body.isActive, 'isActive');
  }
};

const validatePlanStatusUpdate = (body) => {
  if (!body || body.isActive === undefined) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'isActive is required.');
  }

  ensureBoolean(body.isActive, 'isActive');
};

const validatePlanRecommendedUpdate = (body) => {
  if (!body || body.recommended === undefined) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'recommended is required.');
  }

  ensureBoolean(body.recommended, 'recommended');
};

const parseBooleanQuery = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be true or false.`);
};

const validatePlanListQuery = (query) => {
  const normalized = {};

  normalized.isActive = parseBooleanQuery(query.isActive, 'isActive');

  if (query.billingCycle !== undefined) {
    ensureBillingCycle(query.billingCycle);
    normalized.billingCycle = query.billingCycle;
  }

  if (query.search !== undefined) {
    normalized.search = String(query.search).trim();
  }

  if (query.sortBy !== undefined) {
    if (!ALLOWED_SORT_FIELDS.includes(query.sortBy)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `sortBy must be one of: ${ALLOWED_SORT_FIELDS.join(', ')}.`
      );
    }

    normalized.sortBy = query.sortBy;
  }

  if (query.sortOrder !== undefined) {
    const direction = String(query.sortOrder).toLowerCase();

    if (!["asc", "desc", "1", "-1"].includes(direction)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "sortOrder must be asc, desc, 1, or -1.");
    }

    normalized.sortOrder = direction === "desc" || direction === "-1" ? -1 : 1;
  }

  return normalized;
};

export {
  validateCreatePlan,
  validateUpdatePlan,
  validatePlanStatusUpdate,
  validatePlanRecommendedUpdate,
  validatePlanListQuery,
};
