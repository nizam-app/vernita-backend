import mongoose from "mongoose";

export const SELF_CARE_MOODS = ["great", "good", "okay", "bad"];

const selfCareEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    entryDate: {
      type: Date,
      required: true,
      index: true,
    },
    hydrationGlasses: {
      type: Number,
      default: 0,
      min: 0,
      max: 8,
    },
    hydrationGoal: {
      type: Number,
      default: 8,
      min: 1,
      max: 20,
    },
    sleepHours: {
      type: Number,
      default: 0,
      min: 0,
      max: 24,
    },
    mood: {
      type: String,
      enum: [...SELF_CARE_MOODS, null],
      default: null,
    },
    meditationDone: {
      type: Boolean,
      default: false,
    },
    stressLevel: {
      type: Number,
      min: 1,
      max: 10,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    completedSections: {
      hydration: {
        type: Boolean,
        default: false,
      },
      sleep: {
        type: Boolean,
        default: false,
      },
      mood: {
        type: Boolean,
        default: false,
      },
      meditation: {
        type: Boolean,
        default: false,
      },
      stress: {
        type: Boolean,
        default: false,
      },
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

selfCareEntrySchema.index(
  { userId: 1, entryDate: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

export const SelfCareEntry =
  mongoose.models.SelfCareEntry ||
  mongoose.model("SelfCareEntry", selfCareEntrySchema);
