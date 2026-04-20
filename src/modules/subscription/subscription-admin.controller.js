import httpStatus from "../../constants/httpStatus.js";
import { catchAsync as asyncHandler } from "../../utils/catchAsync.js";
import ApiResponse from "../../utils/api-response.js";
import * as subscriptionService from "./subscription.service.js";
import {
  validateAdminSubscriptionQuery,
  validateAdminPaymentQuery,
} from "./subscription.validation.js";

export const listSubscriptions = asyncHandler(async (req, res) => {
  const query = validateAdminSubscriptionQuery(req.query);
  const subscriptions = await subscriptionService.listAdminSubscriptions(query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Subscriptions fetched successfully.',
    data: subscriptions,
  });
});

export const getSubscriptionByUserId = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.getAdminSubscriptionByUserId(req.params.userId);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Subscription fetched successfully.',
    data: subscription,
  });
});

export const listPayments = asyncHandler(async (req, res) => {
  const query = validateAdminPaymentQuery(req.query);
  const payments = await subscriptionService.listAdminPayments(query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Payments fetched successfully.',
    data: payments,
  });
});

export const getPaymentById = asyncHandler(async (req, res) => {
  const payment = await subscriptionService.getAdminPaymentById(req.params.orderId);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Payment fetched successfully.',
    data: payment,
  });
});
