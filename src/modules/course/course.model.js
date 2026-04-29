import mongoose from "mongoose";

export const COURSE_LEVELS = ["beginner", "intermediate", "advanced"];
export const COURSE_ACCESS_TYPES = ["free", "paid", "subscription"];
export const COURSE_STATUSES = ["draft", "published", "archived"];

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required."],
      trim: true,
      maxlength: 180,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 5000,
    },
    bannerImage: {
      type: String,
      trim: true,
      default: "",
    },
    bannerImagePublicId: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    instructorName: {
      type: String,
      required: [true, "Instructor name is required."],
      trim: true,
      maxlength: 120,
    },
    instructorTitle: {
      type: String,
      trim: true,
      default: "",
      maxlength: 160,
    },
    instructorBio: {
      type: String,
      trim: true,
      default: "",
      maxlength: 3000,
    },
    level: {
      type: String,
      enum: COURSE_LEVELS,
      default: "beginner",
      index: true,
    },
    durationText: {
      type: String,
      trim: true,
      default: "",
    },
    durationInWeeks: {
      type: Number,
      min: 0,
      default: null,
    },
    lessonsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    studentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    certificateEnabled: {
      type: Boolean,
      default: false,
    },
    accessType: {
      type: String,
      enum: COURSE_ACCESS_TYPES,
      default: "free",
      index: true,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "USD",
      maxlength: 10,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: COURSE_STATUSES,
      default: "draft",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
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

courseSchema.index({ title: 1, isDeleted: 1 });
courseSchema.index({ category: 1, level: 1, accessType: 1 });
courseSchema.index({ isPublished: 1, isFeatured: 1, status: 1 });

export const Course = mongoose.models.Course || mongoose.model("Course", courseSchema);
