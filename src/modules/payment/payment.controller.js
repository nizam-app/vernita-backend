import Stripe from "stripe";
import httpStatus from "../../constants/httpStatus.js";
import getStripeClient from "../../config/stripe.js";
import ApiResponse from "../../utils/api-response.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { handleCourseStripeWebhook } from "../course/course.service.js";
import { handleStripeWebhook as handleSubscriptionStripeWebhook } from "../subscription/subscription.service.js";
import { handleCoachingStripeWebhook } from "../coaching/coaching.service.js";
import { handleWebinarStripeWebhook } from "../webinar/webinar.service.js";
import { confirmCheckoutSession } from "./payment.service.js";

export const stripeWebhook = catchAsync(async (req, res) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("Stripe webhook secret is not configured.");
  }

  const stripe = getStripeClient();
  const signature = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      return res.status(httpStatus.BAD_REQUEST).json({
        status: "fail",
        message: "Invalid Stripe webhook signature.",
      });
    }

    throw error;
  }

  const itemType = event.data?.object?.metadata?.itemType || "subscription";

  if (itemType === "course") {
    await handleCourseStripeWebhook(event);
  } else if (itemType === "coaching") {
    await handleCoachingStripeWebhook(event);
  } else if (itemType === "webinar") {
    await handleWebinarStripeWebhook(event);
  } else {
    await handleSubscriptionStripeWebhook(event);
  }

  return res.status(httpStatus.OK).json({
    status: "success",
    message: "Stripe webhook processed successfully.",
    data: { received: true },
  });
});

export const confirmCheckout = catchAsync(async (req, res) => {
  const sessionId = req.body?.sessionId;
  const result = await confirmCheckoutSession(sessionId, req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Payment confirmed successfully.",
    data: result,
  });
});
