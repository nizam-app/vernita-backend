import mongoose from "mongoose";

const lessonProgressSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    watchedSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    isCompleted: {
      type: Boolean,
      default: false,
      index: true,
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

lessonProgressSchema.index({ lessonId: 1, userId: 1 }, { unique: true });
lessonProgressSchema.index({ courseId: 1, userId: 1, isCompleted: 1 });

export const LessonProgress =
  mongoose.models.LessonProgress ||
  mongoose.model("LessonProgress", lessonProgressSchema);
