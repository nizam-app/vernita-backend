import mongoose from "mongoose";
import { ALL_BILLING_CYCLES, BILLING_CYCLES } from "./billingCycle.js";

export { BILLING_CYCLES, ALL_BILLING_CYCLES };

export const QUOTA_PERIODS = ["lifetime", "month", "year"];
export const CHECK_IN_QUOTA_PERIODS = ["month"];

const planEntitlementsSchema = new mongoose.Schema(
  {
    maxCourses: {
      type: Number,
      min: 0,
      default: 0,
    },
    maxWebinars: {
      type: Number,
      min: 0,
      default: 0,
    },
    quotaPeriod: {
      type: String,
      enum: QUOTA_PERIODS,
      default: "lifetime",
    },
    checkInDurationMinutes: {
      type: Number,
      min: 0,
      default: 0,
    },
    checkInsPerPeriod: {
      type: Number,
      min: 0,
      default: 0,
    },
    checkInQuotaPeriod: {
      type: String,
      enum: [...CHECK_IN_QUOTA_PERIODS, null],
      default: null,
    },
  },
  { _id: false }
);

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Plan name is required."],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    price: {
      type: Number,
      required: [true, "Plan price is required."],
      min: [0, "Price cannot be negative."],
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "USD",
      maxlength: 10,
    },
    billingCycle: {
      type: String,
      enum: ALL_BILLING_CYCLES,
      required: [true, "Billing cycle is required."],
    },
    features: {
      type: [String],
      default: [],
    },
    entitlements: {
      type: planEntitlementsSchema,
      default: () => ({}),
    },
    webinarDiscountPercent: {
      type: Number,
      min: [0, "webinarDiscountPercent cannot be negative."],
      default: 0,
    },
    recommended: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

planSchema.index({ name: 1, isDeleted: 1 });

export const Plan = mongoose.models.Plan || mongoose.model("Plan", planSchema);
