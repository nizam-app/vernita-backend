import httpStatus from "../../constants/httpStatus.js";
import getStripeClient from "../../config/stripe.js";
import ApiError from "../../utils/api-error.js";
import { completeCourseOrderFromCheckoutSession } from "../course/course.service.js";
import { handleCoachingStripeWebhook } from "../coaching/coaching.service.js";
import { handleWebinarStripeWebhook } from "../webinar/webinar.service.js";
import { handleStripeWebhook as handleSubscriptionStripeWebhook } from "../subscription/subscription.service.js";

const PAID_SESSION_STATUSES = new Set(["paid", "complete", "no_payment_required"]);

export const confirmCheckoutSession = async (sessionId, userId) => {
  const normalizedSessionId = String(sessionId || "").trim();
  if (!normalizedSessionId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "sessionId is required.");
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(normalizedSessionId);

  if (!PAID_SESSION_STATUSES.has(session.payment_status) && session.status !== "complete") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Checkout session is not paid yet. Please wait and try again."
    );
  }

  const sessionUserId = session.metadata?.userId;
  if (sessionUserId && sessionUserId !== userId.toString()) {
    throw new ApiError(httpStatus.FORBIDDEN, "This checkout session does not belong to you.");
  }

  const itemType = session.metadata?.itemType || "subscription";
  const event = {
    id: `confirm-${session.id}`,
    type: "checkout.session.completed",
    data: { object: session },
  };

  if (itemType === "course") {
    return completeCourseOrderFromCheckoutSession(session, event.id);
  }

  if (itemType === "coaching") {
    await handleCoachingStripeWebhook(event);
    return { itemType, sessionId: session.id, confirmed: true };
  }

  if (itemType === "webinar") {
    return handleWebinarStripeWebhook(event);
  }

  await handleSubscriptionStripeWebhook(event);
  return { itemType, sessionId: session.id, confirmed: true };
};
