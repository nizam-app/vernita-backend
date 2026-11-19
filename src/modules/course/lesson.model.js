import mongoose from "mongoose";

export const LESSON_RESOURCE_TYPES = ["transcript", "workbook", "reading", "file", "link"];
export const LESSON_CONTENT_TYPES = ["video", "text", "quiz"];

const quizChoiceSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "Choice text is required."],
      trim: true,
      maxlength: 1000,
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const quizQuestionSchema = new mongoose.Schema(
  {
    prompt: {
      type: String,
      required: [true, "Question prompt is required."],
      trim: true,
      maxlength: 2000,
    },
    choices: {
      type: [quizChoiceSchema],
      default: [],
    },
  },
  { _id: true }
);

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
    assetPublicId: {
      type: String,
      trim: true,
      default: "",
    },
    assetResourceType: {
      type: String,
      trim: true,
      default: "raw",
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
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chapter",
      required: [true, "Chapter is required."],
      index: true,
    },
    contentType: {
      type: String,
      enum: LESSON_CONTENT_TYPES,
      default: "video",
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
    body: {
      type: String,
      trim: true,
      default: "",
      maxlength: 20000,
    },
    videoUrl: {
      type: String,
      trim: true,
      default: "",
    },
    videoPublicId: {
      type: String,
      trim: true,
      default: "",
    },
    videoAssetResourceType: {
      type: String,
      trim: true,
      default: "video",
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
    questions: {
      type: [quizQuestionSchema],
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
    isPrerequisite: {
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

lessonSchema.index({ chapterId: 1, sortOrder: 1 }, { unique: true });
lessonSchema.set("autoIndex", false);

export const Lesson = mongoose.models.Lesson || mongoose.model("Lesson", lessonSchema);
