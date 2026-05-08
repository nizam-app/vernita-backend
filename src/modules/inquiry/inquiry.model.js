import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema(
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
    phoneNumber: {
      type: String,
      trim: true,
      required: [true, "phoneNumber is required."],
      maxlength: 50,
    },
    serviceInterestedIn: {
      type: String,
      trim: true,
      required: [true, "serviceInterestedIn is required."],
      maxlength: 160,
    },
    message: {
      type: String,
      trim: true,
      required: [true, "message is required."],
      maxlength: 5000,
    },
    source: {
      type: String,
      trim: true,
      default: "website",
      maxlength: 120,
      index: true,
    },
    meta: {
      ip: { type: String, trim: true, default: "" },
      userAgent: { type: String, trim: true, default: "" },
      referer: { type: String, trim: true, default: "" },
    },
  },
  { timestamps: true, versionKey: false }
);

inquirySchema.index({ createdAt: -1 });
inquirySchema.index({ email: 1, createdAt: -1 });

export const Inquiry = mongoose.models.Inquiry || mongoose.model("Inquiry", inquirySchema);

