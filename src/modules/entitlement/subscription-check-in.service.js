import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../utils/api-error.js";
import {
  getCheckInBenefitPeriod,
} from "./entitlement.service.js";
import { SubscriptionBenefitPeriod } from "./subscriptionBenefitPeriod.model.js";
import {
  SubscriptionCheckInSession,
  CHECK_IN_SESSION_STATUSES,
} from "./subscriptionCheckInSession.model.js";

const RESCHEDULE_NOTICE_MS = 24 * 60 * 60 * 1000;

const assertRescheduleWindow = (scheduledAt) => {
  const target = new Date(scheduledAt);
  if (target.getTime() - Date.now() < RESCHEDULE_NOTICE_MS) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Changes require at least 24 hours notice before the scheduled time."
    );
  }
};

const sanitizeSession = (session) => ({
  id: session._id,
  userId: session.userId,
  planId: session.planId,
  benefitPeriodId: session.benefitPeriodId,
  periodKey: session.periodKey,
  scheduledAt: session.scheduledAt,
  durationMinutes: session.durationMinutes,
  meetingLink: session.meetingLink,
  sessionStatus: session.sessionStatus,
  notes: session.notes,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
});

export const getCheckInOverview = async (user) => {
  try {
    const { plan, entitlements, period } = await getCheckInBenefitPeriod(user);
    const scheduled = await SubscriptionCheckInSession.findOne({
      userId: user._id,
      planId: plan._id,
      periodKey: period.periodKey,
      sessionStatus: "scheduled",
    }).sort({ scheduledAt: 1 });

    const remaining = Math.max(
      0,
      (period.checkInsGranted ?? 0) - (period.checkInsScheduled ?? 0)
    );

    return {
      available: remaining > 0,
      durationMinutes: entitlements.checkInDurationMinutes,
      periodKey: period.periodKey,
      periodEnd: period.periodEnd,
      remaining,
      upcomingSession: scheduled ? sanitizeSession(scheduled) : null,
      policy: {
        rescheduleNoticeHours: 24,
        unusedSessionsExpire: true,
      },
    };
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === httpStatus.BAD_REQUEST) {
      return {
        available: false,
        durationMinutes: 0,
        remaining: 0,
        upcomingSession: null,
        policy: { rescheduleNoticeHours: 24, unusedSessionsExpire: true },
      };
    }
    throw error;
  }
};

export const scheduleCheckIn = async (user, { scheduledAt, meetingLink, notes }) => {
  if (!scheduledAt) {
    throw new ApiError(httpStatus.BAD_REQUEST, "scheduledAt is required.");
  }

  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
    throw new ApiError(httpStatus.BAD_REQUEST, "scheduledAt must be a future date.");
  }

  const { plan, entitlements, period } = await getCheckInBenefitPeriod(user);

  const activeScheduled = await SubscriptionCheckInSession.findOne({
    userId: user._id,
    planId: plan._id,
    periodKey: period.periodKey,
    sessionStatus: "scheduled",
  });

  if (activeScheduled) {
    throw new ApiError(httpStatus.CONFLICT, "You already have a scheduled check-in for this period.");
  }

  if (period.checkInsScheduled >= period.checkInsGranted) {
    throw new ApiError(httpStatus.FORBIDDEN, "No check-in credits remaining for this period.");
  }

  const session = await SubscriptionCheckInSession.create({
    userId: user._id,
    planId: plan._id,
    benefitPeriodId: period._id,
    periodKey: period.periodKey,
    scheduledAt: when,
    durationMinutes: entitlements.checkInDurationMinutes,
    meetingLink: meetingLink || "",
    notes: notes || "",
    sessionStatus: "scheduled",
  });

  await SubscriptionBenefitPeriod.findByIdAndUpdate(period._id, {
    $inc: { checkInsScheduled: 1 },
  });

  return sanitizeSession(session);
};

export const rescheduleCheckIn = async (user, sessionId, { scheduledAt, meetingLink, notes }) => {
  const session = await SubscriptionCheckInSession.findOne({
    _id: sessionId,
    userId: user._id,
    sessionStatus: "scheduled",
  });

  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, "Scheduled check-in not found.");
  }

  assertRescheduleWindow(session.scheduledAt);

  if (!scheduledAt) {
    throw new ApiError(httpStatus.BAD_REQUEST, "scheduledAt is required.");
  }

  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
    throw new ApiError(httpStatus.BAD_REQUEST, "scheduledAt must be a future date.");
  }

  session.scheduledAt = when;
  if (meetingLink !== undefined) session.meetingLink = meetingLink;
  if (notes !== undefined) session.notes = notes;
  await session.save();

  return sanitizeSession(session);
};

export const cancelCheckIn = async (user, sessionId) => {
  const session = await SubscriptionCheckInSession.findOne({
    _id: sessionId,
    userId: user._id,
    sessionStatus: "scheduled",
  });

  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, "Scheduled check-in not found.");
  }

  assertRescheduleWindow(session.scheduledAt);

  session.sessionStatus = "canceled";
  await session.save();

  await SubscriptionBenefitPeriod.findByIdAndUpdate(session.benefitPeriodId, {
    $inc: { checkInsScheduled: -1 },
  });

  return sanitizeSession(session);
};

export const expireStaleCheckInCredits = async () => {
  const now = new Date();
  const expiredPeriods = await SubscriptionBenefitPeriod.find({
    periodType: "check_in_month",
    periodEnd: { $lt: now },
    checkInsGranted: { $gt: 0 },
  });

  for (const period of expiredPeriods) {
    const unused = Math.max(0, period.checkInsGranted - period.checkInsScheduled);
    if (unused <= 0) continue;

    await SubscriptionCheckInSession.updateMany(
      {
        benefitPeriodId: period._id,
        sessionStatus: "scheduled",
      },
      { sessionStatus: "expired" }
    );
  }
};
