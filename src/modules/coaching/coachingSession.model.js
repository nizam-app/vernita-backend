import mongoose from "mongoose";

export const COACHING_SESSION_STATUSES = [
  "scheduled",
  "completed",
  "canceled",
  "no_show",
];

const coachingSessionSchema = new mongoose.Schema(
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
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CoachingPurchase",
      default: null,
      index: true,
    },
    coachName: {
      type: String,
      trim: true,
      default: "",
    },
    scheduledAt: {
      type: Date,
      required: [true, "scheduledAt is required."],
      index: true,
    },
    durationMinutes: {
      type: Number,
      min: [1, "durationMinutes must be at least 1."],
      default: 30,
    },
    meetingLink: {
      type: String,
      trim: true,
      default: "",
    },
    sessionStatus: {
      type: String,
      enum: COACHING_SESSION_STATUSES,
      default: "scheduled",
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true, versionKey: false }
);

coachingSessionSchema.index({ userId: 1, coachingPackageId: 1, scheduledAt: -1 });

export const CoachingSession =
  mongoose.models.CoachingSession ||
  mongoose.model("CoachingSession", coachingSessionSchema);

