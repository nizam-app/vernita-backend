import mongoose from "mongoose";

const fitnessEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    workoutType: {
      type: String,
      required: [true, "Workout type is required."],
      trim: true,
      maxlength: 120,
      index: true,
    },
    durationMinutes: {
      type: Number,
      required: [true, "Workout duration is required."],
      min: [1, "Duration must be greater than 0."],
    },
    caloriesBurned: {
      type: Number,
      default: 0,
      min: [0, "Calories burned cannot be negative."],
    },
    workoutDate: {
      type: Date,
      required: [true, "Workout date is required."],
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
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

fitnessEntrySchema.index({ userId: 1, isDeleted: 1, workoutDate: -1 });
fitnessEntrySchema.index({ userId: 1, workoutType: 1, isDeleted: 1 });

export const FitnessEntry =
  mongoose.models.FitnessEntry ||
  mongoose.model("FitnessEntry", fitnessEntrySchema);
