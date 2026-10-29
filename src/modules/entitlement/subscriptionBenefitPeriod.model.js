import mongoose from "mongoose";

export const BENEFIT_PERIOD_TYPES = ["lifetime", "month", "year", "check_in_month"];

const subscriptionBenefitPeriodSchema = new mongoose.Schema(
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
    periodType: {
      type: String,
      enum: BENEFIT_PERIOD_TYPES,
      required: true,
    },
    periodKey: {
      type: String,
      required: true,
      trim: true,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      default: null,
    },
    coursesUsed: {
      type: Number,
      min: 0,
      default: 0,
    },
    webinarsUsed: {
      type: Number,
      min: 0,
      default: 0,
    },
    checkInsGranted: {
      type: Number,
      min: 0,
      default: 0,
    },
    checkInsScheduled: {
      type: Number,
      min: 0,
      default: 0,
    },
    checkInsCompleted: {
      type: Number,
      min: 0,
      default: 0,
    },
    sourceOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    sourceStripeInvoiceId: {
      type: String,
      default: null,
      index: true,
    },
  },
  { timestamps: true, versionKey: false }
);

subscriptionBenefitPeriodSchema.index(
  { userId: 1, planId: 1, periodType: 1, periodKey: 1 },
  { unique: true }
);

export const SubscriptionBenefitPeriod =
  mongoose.models.SubscriptionBenefitPeriod ||
  mongoose.model("SubscriptionBenefitPeriod", subscriptionBenefitPeriodSchema);
