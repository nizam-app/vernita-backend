import mongoose from "mongoose";

export const CHECK_IN_SESSION_STATUSES = [
  "scheduled",
  "completed",
  "canceled",
  "expired",
  "no_show",
];

const subscriptionCheckInSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },
    benefitPeriodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionBenefitPeriod",
      required: true,
      index: true,
    },
    periodKey: {
      type: String,
      required: true,
      trim: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    durationMinutes: {
      type: Number,
      min: 1,
      required: true,
    },
    meetingLink: {
      type: String,
      trim: true,
      default: "",
    },
    sessionStatus: {
      type: String,
      enum: CHECK_IN_SESSION_STATUSES,
      default: "scheduled",
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionCheckInSession",
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

export const SubscriptionCheckInSession =
  mongoose.models.SubscriptionCheckInSession ||
  mongoose.model("SubscriptionCheckInSession", subscriptionCheckInSessionSchema);
