import mongoose from "mongoose";

const budgetSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    monthlyBudget: {
      type: Number,
      default: 0,
      min: [0, "Monthly budget cannot be negative."],
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "USD",
      maxlength: 10,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const BudgetSettings =
  mongoose.models.BudgetSettings ||
  mongoose.model("BudgetSettings", budgetSettingsSchema);
