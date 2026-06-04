import mongoose from "mongoose";

export const TASK_TYPES = ["daily", "weekly", "one_time"];
export const TASK_PRIORITIES = ["high", "medium", "low"];

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Task title is required."],
      trim: true,
      maxlength: 180,
    },
    type: {
      type: String,
      enum: TASK_TYPES,
      default: "one_time",
      index: true,
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "medium",
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
      index: true,
    },
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 3000,
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

taskSchema.index({ userId: 1, isDeleted: 1, dueDate: 1 });
taskSchema.index({ userId: 1, completed: 1, isDeleted: 1 });

export const Task = mongoose.models.Task || mongoose.model("Task", taskSchema);
