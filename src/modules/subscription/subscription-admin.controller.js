const asyncHandler = require('../../utils/async-handler');
const ApiResponse = require('../../utils/api-response');
const httpStatus = require('../../constants/http-status');
const subscriptionService = require('./subscription.service');
const {
  validateAdminSubscriptionQuery,
  validateAdminPaymentQuery,
} = require('./subscription.validation');

const listSubscriptions = asyncHandler(async (req, res) => {
  const query = validateAdminSubscriptionQuery(req.query);
  const subscriptions = await subscriptionService.listAdminSubscriptions(query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Subscriptions fetched successfully.',
    data: subscriptions,
  });
});

const getSubscriptionByUserId = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.getAdminSubscriptionByUserId(req.params.userId);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Subscription fetched successfully.',
    data: subscription,
  });
});

const listPayments = asyncHandler(async (req, res) => {
  const query = validateAdminPaymentQuery(req.query);
  const payments = await subscriptionService.listAdminPayments(query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Payments fetched successfully.',
    data: payments,
  });
});

const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await subscriptionService.getAdminPaymentById(req.params.orderId);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Payment fetched successfully.',
    data: payment,
  });
});

module.exports = {
  listSubscriptions,
  getSubscriptionByUserId,
  listPayments,
  getPaymentById,
};
