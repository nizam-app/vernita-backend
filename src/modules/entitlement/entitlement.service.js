import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../utils/api-error.js";
import { normalizeBillingCycle } from "../plan/billingCycle.js";
import { Plan } from "../plan/plan.model.js";
import { sanitizeEntitlements } from "../plan/plan.service.js";
import { SubscriptionBenefitPeriod } from "./subscriptionBenefitPeriod.model.js";

const SUBSCRIPTION_ACTIVE = "active";

const monthKey = (date = new Date()) => {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

const yearKey = (date = new Date()) => {
  return String(new Date(date).getUTCFullYear());
};

const monthBounds = (date = new Date()) => {
  const d = new Date(date);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
};

const yearBounds = (date = new Date()) => {
  const y = new Date(date).getUTCFullYear();
  const start = new Date(Date.UTC(y, 0, 1));
  const end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
  return { start, end };
};

export const getPlanEntitlements = (plan) =>
  sanitizeEntitlements(plan?.entitlements ?? plan);

export const assertActiveSubscription = (user) => {
  const sub = user?.subscription;
  if (!sub || sub.status !== SUBSCRIPTION_ACTIVE || !sub.isActive || !sub.planId) {
    throw new ApiError(httpStatus.FORBIDDEN, "An active subscription is required.");
  }

  if (sub.endsAt && new Date(sub.endsAt) < new Date()) {
    throw new ApiError(httpStatus.FORBIDDEN, "Your subscription period has ended.");
  }

  return sub;
};

const loadActivePlan = async (user) => {
  assertActiveSubscription(user);
  const plan = await Plan.findOne({
    _id: user.subscription.planId,
    isDeleted: false,
    isActive: true,
  });
  if (!plan) {
    throw new ApiError(httpStatus.FORBIDDEN, "Subscription plan is no longer available.");
  }
  return plan;
};

const createPeriodIfMissing = async ({
  userId,
  planId,
  periodType,
  periodKey,
  periodStart,
  periodEnd,
  checkInsGranted = 0,
  sourceOrderId = null,
  sourceStripeInvoiceId = null,
}) => {
  if (sourceStripeInvoiceId) {
    const existingByInvoice = await SubscriptionBenefitPeriod.findOne({
      sourceStripeInvoiceId,
      periodType,
      userId,
      planId,
    });
    if (existingByInvoice) {
      return existingByInvoice;
    }
  }

  try {
    return await SubscriptionBenefitPeriod.create({
      userId,
      planId,
      periodType,
      periodKey,
      periodStart,
      periodEnd,
      checkInsGranted,
      sourceOrderId,
      sourceStripeInvoiceId,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return SubscriptionBenefitPeriod.findOne({
        userId,
        planId,
        periodType,
        periodKey,
      });
    }
    throw error;
  }
};

export const onSubscriptionActivated = async ({
  user,
  plan,
  orderId = null,
  stripeInvoiceId = null,
  periodStart = new Date(),
}) => {
  const billingCycle = normalizeBillingCycle(plan.billingCycle);
  const ent = getPlanEntitlements(plan);
  const userId = user._id;
  const planId = plan._id;

  if (billingCycle === "one_time") {
    await createPeriodIfMissing({
      userId,
      planId,
      periodType: "lifetime",
      periodKey: "lifetime",
      periodStart,
      periodEnd: null,
      sourceOrderId: orderId,
      sourceStripeInvoiceId: stripeInvoiceId,
    });
    return;
  }

  if (billingCycle === "monthly") {
    const { start, end } = monthBounds(periodStart);
    await createPeriodIfMissing({
      userId,
      planId,
      periodType: "month",
      periodKey: monthKey(periodStart),
      periodStart: start,
      periodEnd: end,
      sourceOrderId: orderId,
      sourceStripeInvoiceId: stripeInvoiceId,
    });
    if (ent.checkInsPerPeriod > 0) {
      await createPeriodIfMissing({
        userId,
        planId,
        periodType: "check_in_month",
        periodKey: monthKey(periodStart),
        periodStart: start,
        periodEnd: end,
        checkInsGranted: ent.checkInsPerPeriod,
        sourceOrderId: orderId,
        sourceStripeInvoiceId: stripeInvoiceId,
      });
    }
    return;
  }

  if (billingCycle === "annual") {
    const { start, end } = yearBounds(periodStart);
    await createPeriodIfMissing({
      userId,
      planId,
      periodType: "year",
      periodKey: yearKey(periodStart),
      periodStart: start,
      periodEnd: end,
      sourceOrderId: orderId,
      sourceStripeInvoiceId: stripeInvoiceId,
    });
    if (ent.checkInsPerPeriod > 0) {
      const { start: mStart, end: mEnd } = monthBounds(periodStart);
      await createPeriodIfMissing({
        userId,
        planId,
        periodType: "check_in_month",
        periodKey: monthKey(periodStart),
        periodStart: mStart,
        periodEnd: mEnd,
        checkInsGranted: ent.checkInsPerPeriod,
        sourceOrderId: orderId,
        sourceStripeInvoiceId: stripeInvoiceId,
      });
    }
  }
};

export const onSubscriptionRenewalPaid = async ({
  user,
  plan,
  stripeInvoiceId,
  periodStart = new Date(),
}) => {
  await onSubscriptionActivated({
    user,
    plan,
    stripeInvoiceId,
    periodStart,
  });
};

const getContentPeriod = async (user, plan) => {
  const billingCycle = normalizeBillingCycle(plan.billingCycle);
  const ent = getPlanEntitlements(plan);
  const now = new Date();

  if (billingCycle === "one_time" || ent.quotaPeriod === "lifetime") {
    return SubscriptionBenefitPeriod.findOne({
      userId: user._id,
      planId: plan._id,
      periodType: "lifetime",
      periodKey: "lifetime",
    });
  }

  if (ent.quotaPeriod === "month" || billingCycle === "monthly") {
    return SubscriptionBenefitPeriod.findOne({
      userId: user._id,
      planId: plan._id,
      periodType: "month",
      periodKey: monthKey(now),
    });
  }

  if (ent.quotaPeriod === "year" || billingCycle === "annual") {
    return SubscriptionBenefitPeriod.findOne({
      userId: user._id,
      planId: plan._id,
      periodType: "year",
      periodKey: yearKey(now),
    });
  }

  return null;
};

const getCheckInPeriod = async (user, plan) => {
  const ent = getPlanEntitlements(plan);
  if (ent.checkInsPerPeriod <= 0) {
    return null;
  }

  return SubscriptionBenefitPeriod.findOne({
    userId: user._id,
    planId: plan._id,
    periodType: "check_in_month",
    periodKey: monthKey(new Date()),
  });
};

const buildUsageFromPeriod = (period, max) => {
  if (!period) {
    return { used: 0, max, remaining: max };
  }
  const used = period.coursesUsed ?? period.webinarsUsed ?? 0;
  return {
    used,
    max,
    remaining: Math.max(0, max - used),
    periodKey: period.periodKey,
    periodEnd: period.periodEnd,
  };
};

export const getSubscriptionUsageForUser = async (user) => {
  const sub = user?.subscription;
  if (!sub?.planId || sub.status !== SUBSCRIPTION_ACTIVE || !sub.isActive) {
    return null;
  }

  const plan = await Plan.findOne({ _id: sub.planId, isDeleted: false });
  if (!plan) {
    return null;
  }

  const ent = getPlanEntitlements(plan);
  const contentPeriod = await getContentPeriod(user, plan);
  const checkInPeriod = await getCheckInPeriod(user, plan);

  const coursesUsed = contentPeriod?.coursesUsed ?? 0;
  const webinarsUsed = contentPeriod?.webinarsUsed ?? 0;

  const checkInsGranted = checkInPeriod?.checkInsGranted ?? 0;
  const checkInsScheduled = checkInPeriod?.checkInsScheduled ?? 0;

  return {
    entitlements: ent,
    usage: {
      courses: {
        used: coursesUsed,
        max: ent.maxCourses,
        remaining: Math.max(0, ent.maxCourses - coursesUsed),
        periodKey: contentPeriod?.periodKey ?? null,
        periodEnd: contentPeriod?.periodEnd ?? null,
      },
      webinars: {
        used: webinarsUsed,
        max: ent.maxWebinars,
        remaining: Math.max(0, ent.maxWebinars - webinarsUsed),
        periodKey: contentPeriod?.periodKey ?? null,
        periodEnd: contentPeriod?.periodEnd ?? null,
      },
      checkIn: {
        granted: checkInsGranted,
        scheduled: checkInsScheduled,
        remaining: Math.max(0, checkInsGranted - checkInsScheduled),
        durationMinutes: ent.checkInDurationMinutes,
        periodKey: checkInPeriod?.periodKey ?? null,
        periodEnd: checkInPeriod?.periodEnd ?? null,
      },
    },
  };
};

export const canConsumeCourse = async (user) => {
  const plan = await loadActivePlan(user);
  const ent = getPlanEntitlements(plan);
  if (ent.maxCourses <= 0) {
    return { allowed: false, reason: "Your plan does not include course benefits." };
  }

  const period = await getContentPeriod(user, plan);
  if (!period) {
    return { allowed: false, reason: "No active benefit period. Please contact support." };
  }

  if (period.coursesUsed >= ent.maxCourses) {
    return { allowed: false, reason: "Course benefit limit reached for this period." };
  }

  return {
    allowed: true,
    plan,
    period,
    remaining: ent.maxCourses - period.coursesUsed,
  };
};

export const consumeCourseBenefit = async (user, courseId) => {
  const check = await canConsumeCourse(user);
  if (!check.allowed) {
    throw new ApiError(httpStatus.FORBIDDEN, check.reason);
  }

  const updated = await SubscriptionBenefitPeriod.findOneAndUpdate(
    { _id: check.period._id, coursesUsed: { $lt: getPlanEntitlements(check.plan).maxCourses } },
    { $inc: { coursesUsed: 1 } },
    { new: true }
  );

  if (!updated) {
    throw new ApiError(httpStatus.CONFLICT, "Course benefit could not be applied. Limit may have been reached.");
  }

  return { plan: check.plan, period: updated, courseId };
};

export const canConsumeWebinar = async (user) => {
  const plan = await loadActivePlan(user);
  const ent = getPlanEntitlements(plan);
  if (ent.maxWebinars <= 0) {
    return { allowed: false, reason: "Your plan does not include webinar benefits." };
  }

  const period = await getContentPeriod(user, plan);
  if (!period) {
    return { allowed: false, reason: "No active benefit period. Please contact support." };
  }

  if (period.webinarsUsed >= ent.maxWebinars) {
    return { allowed: false, reason: "Webinar benefit limit reached for this period." };
  }

  return {
    allowed: true,
    plan,
    period,
    remaining: ent.maxWebinars - period.webinarsUsed,
  };
};

export const consumeWebinarBenefit = async (user) => {
  const check = await canConsumeWebinar(user);
  if (!check.allowed) {
    throw new ApiError(httpStatus.FORBIDDEN, check.reason);
  }

  const updated = await SubscriptionBenefitPeriod.findOneAndUpdate(
    { _id: check.period._id, webinarsUsed: { $lt: getPlanEntitlements(check.plan).maxWebinars } },
    { $inc: { webinarsUsed: 1 } },
    { new: true }
  );

  if (!updated) {
    throw new ApiError(httpStatus.CONFLICT, "Webinar benefit could not be applied. Limit may have been reached.");
  }

  return { plan: check.plan, period: updated };
};

export const getCheckInBenefitPeriod = async (user) => {
  const plan = await loadActivePlan(user);
  const ent = getPlanEntitlements(plan);
  if (ent.checkInsPerPeriod <= 0 || ent.checkInDurationMinutes <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Your plan does not include check-in sessions.");
  }

  let period = await getCheckInPeriod(user, plan);
  if (!period) {
    const { start, end } = monthBounds(new Date());
    period = await createPeriodIfMissing({
      userId: user._id,
      planId: plan._id,
      periodType: "check_in_month",
      periodKey: monthKey(new Date()),
      periodStart: start,
      periodEnd: end,
      checkInsGranted: ent.checkInsPerPeriod,
    });
  }

  return { plan, entitlements: ent, period };
};

export { monthKey, yearKey, monthBounds };
