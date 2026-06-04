import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../utils/api-error.js";

const ensureMongoId = (value, fieldName) => {
  if (!value || typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a valid id.`);
  }
};

const validateCheckout = (body) => {
  ensureMongoId(body.planId, 'planId');
};

const validateCancel = (body) => {
  if (body.reason !== undefined && (typeof body.reason !== 'string' || !body.reason.trim())) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'reason must be a non-empty string.');
  }
};

const validateChangePlan = (body) => {
  ensureMongoId(body.planId, 'planId');
};

const validateAdminSubscriptionQuery = (query) => {
  const normalized = {};

  if (query.status !== undefined) {
    normalized.status = String(query.status).trim();
  }

  if (query.isActive !== undefined) {
    if (query.isActive !== "true" && query.isActive !== "false") {
      throw new ApiError(httpStatus.BAD_REQUEST, "isActive must be true or false.");
    }

    normalized.isActive = query.isActive === "true";
  }

  if (query.planId !== undefined) {
    ensureMongoId(query.planId, 'planId');
    normalized.planId = query.planId;
  }

  if (query.search !== undefined) {
    normalized.search = String(query.search).trim();
  }

  return normalized;
};

const validateAdminPaymentQuery = (query) => {
  const normalized = {
    itemType: "subscription",
  };

  if (query.status !== undefined) {
    normalized.status = String(query.status).trim();
  }

  if (query.itemType !== undefined) {
    normalized.itemType = String(query.itemType).trim();
  }

  if (query.orderType !== undefined) {
    normalized.orderType = String(query.orderType).trim();
  }

  if (query.page !== undefined) {
    const page = Number.parseInt(String(query.page), 10);
    if (!Number.isInteger(page) || page < 1) {
      throw new ApiError(httpStatus.BAD_REQUEST, "page must be a positive integer.");
    }
    normalized.page = page;
  }

  if (query.limit !== undefined) {
    const limit = Number.parseInt(String(query.limit), 10);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ApiError(httpStatus.BAD_REQUEST, "limit must be between 1 and 100.");
    }
    normalized.limit = limit;
  }

  if (query.userId !== undefined) {
    ensureMongoId(query.userId, 'userId');
    normalized.userId = query.userId;
  }

  if (query.planId !== undefined) {
    ensureMongoId(query.planId, 'planId');
    normalized.planId = query.planId;
  }

  if (query.search !== undefined) {
    normalized.search = String(query.search).trim();
  }

  return normalized;
};

const validateSubscriptionManagementQuery = (query) => {
  const normalized = {};

  if (query.currency !== undefined) {
    normalized.currency = String(query.currency).trim().toUpperCase();
  }

  if (query.from !== undefined) {
    normalized.from = String(query.from).trim();
  }

  if (query.to !== undefined) {
    normalized.to = String(query.to).trim();
  }

  if (query.paymentsLimit !== undefined) {
    const paymentsLimit = Number.parseInt(String(query.paymentsLimit), 10);
    if (!Number.isInteger(paymentsLimit) || paymentsLimit < 1 || paymentsLimit > 50) {
      throw new ApiError(httpStatus.BAD_REQUEST, "paymentsLimit must be between 1 and 50.");
    }
    normalized.paymentsLimit = paymentsLimit;
  }

  return normalized;
};

export {
  validateCheckout,
  validateCancel,
  validateChangePlan,
  validateAdminSubscriptionQuery,
  validateAdminPaymentQuery,
  validateSubscriptionManagementQuery,
};
