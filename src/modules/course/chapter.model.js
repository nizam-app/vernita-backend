import mongoose from "mongoose";

const chapterSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Chapter title is required."],
      trim: true,
      maxlength: 180,
    },
    sortOrder: {
      type: Number,
      required: [true, "Chapter sortOrder is required."],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

chapterSchema.index({ courseId: 1, sortOrder: 1 }, { unique: true });
chapterSchema.set("autoIndex", false);

export const Chapter = mongoose.models.Chapter || mongoose.model("Chapter", chapterSchema);
