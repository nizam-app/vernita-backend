import mongoose from "mongoose";

/**
 * Shared MongoDB collection for Website #2 (and other sites) consultation forms.
 * Collection name: consultation_requests
 */
const consultationRequestSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      required: [true, "fullName is required."],
      maxlength: 200,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: [true, "email is required."],
      maxlength: 320,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 50,
    },
    preferredDate: {
      type: Date,
      required: [true, "preferredDate is required."],
    },
    preferredTime: {
      type: String,
      trim: true,
      required: [true, "preferredTime is required."],
      maxlength: 80,
    },
    message: {
      type: String,
      trim: true,
      required: [true, "message is required."],
      maxlength: 5000,
    },
    /** Identifies which frontend submitted the form (e.g. website-2). */
    source: {
      type: String,
      trim: true,
      default: "website-2",
      maxlength: 120,
      index: true,
    },
    status: {
      type: String,
      enum: ["new", "contacted", "scheduled", "closed"],
      default: "new",
      index: true,
    },
    meta: {
      ip: { type: String, trim: true, default: "" },
      userAgent: { type: String, trim: true, default: "" },
      referer: { type: String, trim: true, default: "" },
    },
    emailNotificationSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, versionKey: false, collection: "consultation_requests" }
);

consultationRequestSchema.index({ createdAt: -1 });
consultationRequestSchema.index({ email: 1, createdAt: -1 });
consultationRequestSchema.index({ preferredDate: 1 });

export const ConsultationRequest =
  mongoose.models.ConsultationRequest ||
  mongoose.model("ConsultationRequest", consultationRequestSchema);
