import mongoose from "mongoose";

export const GOAL_STATUSES = ["active", "completed", "archived"];

const milestoneSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Milestone title is required."],
      trim: true,
      maxlength: 180,
    },
    completed: {
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
  }
);

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Goal title is required."],
      trim: true,
      maxlength: 180,
    },
    category: {
      type: String,
      required: [true, "Goal category is required."],
      trim: true,
      maxlength: 100,
      index: true,
    },
    deadline: {
      type: Date,
      default: null,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 3000,
    },
    status: {
      type: String,
      enum: GOAL_STATUSES,
      default: "active",
      index: true,
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    milestones: {
      type: [milestoneSchema],
      default: [],
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

goalSchema.index({ userId: 1, status: 1, isDeleted: 1 });
goalSchema.index({ userId: 1, category: 1, isDeleted: 1 });
goalSchema.index({ userId: 1, deadline: 1, isDeleted: 1 });

export const Goal = mongoose.models.Goal || mongoose.model("Goal", goalSchema);
