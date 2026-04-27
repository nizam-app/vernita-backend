import mongoose from "mongoose";

export const COACHING_PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "free",
  "refunded",
];
export const COACHING_PURCHASE_STATUSES = ["active", "completed", "canceled"];
export const COACHING_ACCESS_TYPES = ["free", "paid"];

const coachingPurchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required."],
      index: true,
    },
    coachingPackageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CoachingPackage",
      required: [true, "coachingPackageId is required."],
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: COACHING_PAYMENT_STATUSES,
      default: "pending",
      index: true,
    },
    purchaseStatus: {
      type: String,
      enum: COACHING_PURCHASE_STATUSES,
      default: "active",
      index: true,
    },
    accessType: {
      type: String,
      enum: COACHING_ACCESS_TYPES,
      required: [true, "accessType is required."],
      index: true,
    },
    orderId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    checkoutSessionId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    paymentIntentId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    stripeCustomerId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    purchasedAt: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
    startsAt: {
      type: Date,
      default: null,
    },
    endsAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

coachingPurchaseSchema.index({ userId: 1, coachingPackageId: 1 });

export const CoachingPurchase =
  mongoose.models.CoachingPurchase ||
  mongoose.model("CoachingPurchase", coachingPurchaseSchema);

