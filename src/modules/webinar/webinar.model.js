import mongoose from "mongoose";

export const WEBINAR_STATUSES = [
  "draft",
  "upcoming",
  "live",
  "completed",
  "canceled",
];

const speakerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, "Speaker name is required."],
      maxlength: 120,
    },
    title: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150,
    },
    bio: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const webinarSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Webinar title is required."],
      trim: true,
      maxlength: 180,
    },
    description: {
      type: String,
      trim: true,
      required: [true, "Webinar description is required."],
      maxlength: 5000,
    },
    category: {
      type: String,
      required: [true, "Webinar category is required."],
      trim: true,
      maxlength: 80,
      index: true,
    },
    speaker: {
      type: speakerSchema,
      required: [true, "Speaker information is required."],
    },
    scheduledAt: {
      type: Date,
      required: [true, "Scheduled date and time is required."],
      index: true,
    },
    durationMinutes: {
      type: Number,
      min: [1, "Duration must be at least 1 minute."],
      default: 60,
    },
    timezone: {
      type: String,
      trim: true,
      default: "UTC",
      maxlength: 80,
    },
    price: {
      type: Number,
      min: [0, "Price cannot be negative."],
      default: 0,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "USD",
      maxlength: 10,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: WEBINAR_STATUSES,
      default: "draft",
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    joinLink: {
      type: String,
      trim: true,
      default: "",
    },
    coverImageUrl: {
      type: String,
      trim: true,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    maxSeats: {
      type: Number,
      min: [1, "maxSeats must be at least 1."],
      default: null,
    },
    registeredCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    publishedAt: {
      type: Date,
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

webinarSchema.index({ title: 1, isDeleted: 1 });
webinarSchema.index({ category: 1, isPublished: 1, isDeleted: 1 });
webinarSchema.index({ status: 1, scheduledAt: 1, isDeleted: 1 });

export const Webinar =
  mongoose.models.Webinar || mongoose.model("Webinar", webinarSchema);
