import mongoose from "mongoose";

export const WEBINAR_PAYMENT_STATUSES = [
  "not_required",
  "pending",
  "completed",
  "failed",
  "refunded",
];

export const WEBINAR_REGISTRATION_STATUSES = [
  "registered",
  "pending_payment",
  "canceled",
];

const webinarRegistrationSchema = new mongoose.Schema(
  {
    webinarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Webinar",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "USD",
      maxlength: 10,
    },
    isPaidWebinar: {
      type: Boolean,
      default: false,
    },
    registrationStatus: {
      type: String,
      enum: WEBINAR_REGISTRATION_STATUSES,
      default: "registered",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: WEBINAR_PAYMENT_STATUSES,
      default: "not_required",
      index: true,
    },
    paymentReference: {
      type: String,
      trim: true,
      default: "",
    },
    paymentProvider: {
      type: String,
      trim: true,
      default: "",
    },
    joinedAt: {
      type: Date,
      default: null,
    },
    lastJoinAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

webinarRegistrationSchema.index({ webinarId: 1, userId: 1 }, { unique: true });
webinarRegistrationSchema.index({ userId: 1, createdAt: -1 });

export const WebinarRegistration =
  mongoose.models.WebinarRegistration ||
  mongoose.model("WebinarRegistration", webinarRegistrationSchema);
