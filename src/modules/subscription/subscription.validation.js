const ApiError = require('../../utils/api-error');
const httpStatus = require('../../constants/http-status');

const ensureMongoId = (value, fieldName) => {
  if (!value || typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) {
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
    if (query.isActive !== 'true' && query.isActive !== 'false') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'isActive must be true or false.');
    }

    normalized.isActive = query.isActive === 'true';
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
  const normalized = {};

  if (query.status !== undefined) {
    normalized.status = String(query.status).trim();
  }

  if (query.orderType !== undefined) {
    normalized.orderType = String(query.orderType).trim();
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

module.exports = {
  validateCheckout,
  validateCancel,
  validateChangePlan,
  validateAdminSubscriptionQuery,
  validateAdminPaymentQuery,
};
