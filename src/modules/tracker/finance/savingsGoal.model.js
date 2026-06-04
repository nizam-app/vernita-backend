import mongoose from "mongoose";

export const SAVINGS_GOAL_STATUSES = ["active", "completed", "archived"];

const savingsGoalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Savings goal title is required."],
      trim: true,
      maxlength: 180,
    },
    targetAmount: {
      type: Number,
      required: [true, "Target amount is required."],
      min: [0.01, "Target amount must be greater than 0."],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, "Current amount cannot be negative."],
    },
    targetDate: {
      type: Date,
      default: null,
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: SAVINGS_GOAL_STATUSES,
      default: "active",
      index: true,
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

savingsGoalSchema.index({ userId: 1, status: 1, isDeleted: 1 });

export const SavingsGoal =
  mongoose.models.SavingsGoal || mongoose.model("SavingsGoal", savingsGoalSchema);
