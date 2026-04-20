import Stripe from "stripe";
import httpStatus from "../../constants/httpStatus.js";
import getStripeClient from "../../config/stripe.js";
import { catchAsync as asyncHandler } from "../../utils/catchAsync.js";
import ApiResponse from "../../utils/api-response.js";
import * as subscriptionService from "./subscription.service.js";
import {
  validateCheckout,
  validateCancel,
  validateChangePlan,
} from "./subscription.validation.js";

export const getPlans = asyncHandler(async (req, res) => {
  const plans = await subscriptionService.getPublicPlans();

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Plans fetched successfully.',
    data: plans,
  });
});

export const comparePlans = asyncHandler(async (req, res) => {
  const plans = await subscriptionService.comparePlans();

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Plans compared successfully.',
    data: plans,
  });
});

export const getCurrentSubscription = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.getCurrentSubscription(req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Current subscription fetched successfully.',
    data: subscription,
  });
});

export const checkoutSubscription = asyncHandler(async (req, res) => {
  validateCheckout(req.body);

  const result = await subscriptionService.checkoutSubscription(req.user._id, req.body.planId);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: result.requiresPayment
      ? 'Checkout session created successfully.'
      : 'Free subscription activated successfully.',
    data: result,
  });
});

export const cancelSubscription = asyncHandler(async (req, res) => {
  validateCancel(req.body);

  const subscription = await subscriptionService.cancelCurrentSubscription(
    req.user._id,
    req.body.reason
  );

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Subscription canceled successfully.',
    data: subscription,
  });
});

export const changePlan = asyncHandler(async (req, res) => {
  validateChangePlan(req.body);

  const result = await subscriptionService.changeSubscriptionPlan(req.user._id, req.body.planId);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: result.requiresPayment
      ? 'Plan change checkout session created successfully.'
      : 'Plan changed successfully.',
    data: result,
  });
});

export const getSubscriptionHistory = asyncHandler(async (req, res) => {
  const history = await subscriptionService.getSubscriptionHistory(req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Subscription history fetched successfully.',
    data: history,
  });
});

export const stripeWebhook = asyncHandler(async (req, res) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook secret is not configured.');
  }

  const stripe = getStripeClient();
  const signature = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid Stripe webhook signature.',
        data: null,
      });
      return;
    }

    throw error;
  }

  await subscriptionService.handleStripeWebhook(event);

  res.status(httpStatus.OK).json({
    success: true,
    message: 'Stripe webhook processed successfully.',
    data: { received: true },
  });
});
