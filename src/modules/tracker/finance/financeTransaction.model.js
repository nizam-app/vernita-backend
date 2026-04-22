import mongoose from "mongoose";

export const FINANCE_TRANSACTION_TYPES = ["income", "expense"];

const financeTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: FINANCE_TRANSACTION_TYPES,
      required: [true, "Transaction type is required."],
      index: true,
    },
    description: {
      type: String,
      required: [true, "Transaction description is required."],
      trim: true,
      maxlength: 180,
    },
    amount: {
      type: Number,
      required: [true, "Transaction amount is required."],
      min: [0.01, "Amount must be greater than 0."],
    },
    category: {
      type: String,
      required: [true, "Transaction category is required."],
      trim: true,
      maxlength: 100,
      index: true,
    },
    transactionDate: {
      type: Date,
      required: [true, "Transaction date is required."],
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

financeTransactionSchema.index({ userId: 1, isDeleted: 1, transactionDate: -1 });
financeTransactionSchema.index({ userId: 1, type: 1, isDeleted: 1 });

export const FinanceTransaction =
  mongoose.models.FinanceTransaction ||
  mongoose.model("FinanceTransaction", financeTransactionSchema);
