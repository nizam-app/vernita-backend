import mongoose from "mongoose";
import { COURSE_ACCESS_TYPES } from "./course.model.js";

export const COURSE_PAYMENT_STATUSES = ["pending", "paid", "failed", "free", "refunded"];

const courseEnrollmentSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    accessType: {
      type: String,
      enum: COURSE_ACCESS_TYPES,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: COURSE_PAYMENT_STATUSES,
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    completedLessonsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

courseEnrollmentSchema.index({ courseId: 1, userId: 1 }, { unique: true });

export const CourseEnrollment =
  mongoose.models.CourseEnrollment ||
  mongoose.model("CourseEnrollment", courseEnrollmentSchema);
