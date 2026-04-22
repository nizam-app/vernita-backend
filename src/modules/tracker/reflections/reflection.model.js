import mongoose from "mongoose";

export const REFLECTION_MOODS = ["great", "good", "okay", "bad"];

const reflectionEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    entryDate: {
      type: Date,
      required: [true, "Reflection date is required."],
      index: true,
    },
    reflectionText: {
      type: String,
      required: [true, "Reflection text is required."],
      trim: true,
      maxlength: 5000,
    },
    gratitudeText: {
      type: String,
      trim: true,
      default: "",
      maxlength: 3000,
    },
    mood: {
      type: String,
      enum: [...REFLECTION_MOODS, null],
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

reflectionEntrySchema.index(
  { userId: 1, entryDate: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
reflectionEntrySchema.index({ userId: 1, isDeleted: 1 });
reflectionEntrySchema.index({ userId: 1, entryDate: -1, isDeleted: 1 });

export const ReflectionEntry =
  mongoose.models.ReflectionEntry ||
  mongoose.model("ReflectionEntry", reflectionEntrySchema);
