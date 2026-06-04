import mongoose from "mongoose";

export const NOTIFICATION_TYPES = [
  "system",
  "webinar_reminder",
  "course_announcement",
  "subscription_renewal_reminder",
];

export const NOTIFICATION_CHANNELS = ["in_app", "email"];

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: NOTIFICATION_CHANNELS,
      default: "in_app",
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
    },
    body: {
      type: String,
      trim: true,
      default: "",
      maxlength: 5000,
    },
    data: {
      type: Object,
      default: {},
    },
    scheduledFor: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
      index: true,
    },
    failureReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    dedupeKey: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
      index: true,
    },
  },
  { timestamps: true, versionKey: false }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ status: 1, scheduledFor: 1 });
notificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, sparse: true }
);

export const Notification =
  mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

