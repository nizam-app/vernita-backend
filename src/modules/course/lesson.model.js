import mongoose from "mongoose";

export const LESSON_RESOURCE_TYPES = ["transcript", "workbook", "reading", "file", "link"];

const lessonResourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      required: [true, "Resource title is required."],
    },
    type: {
      type: String,
      enum: LESSON_RESOURCE_TYPES,
      required: [true, "Resource type is required."],
    },
    url: {
      type: String,
      trim: true,
      required: [true, "Resource URL is required."],
    },
  },
  {
    _id: false,
  }
);

const lessonSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Lesson title is required."],
      trim: true,
      maxlength: 180,
    },
    summary: {
      type: String,
      trim: true,
      default: "",
      maxlength: 3000,
    },
    videoUrl: {
      type: String,
      trim: true,
      default: "",
    },
    videoDurationText: {
      type: String,
      trim: true,
      default: "",
    },
    videoDurationSeconds: {
      type: Number,
      min: 0,
      default: 0,
    },
    resources: {
      type: [lessonResourceSchema],
      default: [],
    },
    sortOrder: {
      type: Number,
      required: [true, "Lesson sortOrder is required."],
      index: true,
    },
    isPreview: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

lessonSchema.index({ courseId: 1, sortOrder: 1 }, { unique: true });

export const Lesson = mongoose.models.Lesson || mongoose.model("Lesson", lessonSchema);
