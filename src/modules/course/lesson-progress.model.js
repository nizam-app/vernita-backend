import mongoose from "mongoose";

const quizResponseSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    choiceIds: {
      type: [String],
      default: [],
    },
    text: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    value: {
      type: Number,
      default: null,
    },
  },
  { _id: false }
);

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
    responses: {
      type: [quizResponseSchema],
      default: [],
    },
    scorePercent: {
      type: Number,
      min: 0,
      max: 100,
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
