import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

const userSubscriptionSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["inactive", "pending", "active", "canceled", "past_due"],
      default: "inactive",
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
    },
    planName: {
      type: String,
      default: null,
    },
    billingCycle: {
      type: String,
      default: null,
    },
    price: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    features: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endsAt: {
      type: Date,
      default: null,
    },
    canceledAt: {
      type: Date,
      default: null,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    stripeCustomerId: {
      type: String,
      default: null,
    },
    stripeSubscriptionId: {
      type: String,
      default: null,
    },
    stripeCheckoutSessionId: {
      type: String,
      default: null,
    },
    lastPaymentStatus: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: undefined,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: undefined,
    },
    // phone: {
    //   type: String,
    //   trim: true,
    //   default: undefined,
    // },
    hashPassword: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    subscription: {
      type: userSubscriptionSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ "subscription.stripeCustomerId": 1 }, { sparse: true });
userSchema.index({ "subscription.stripeSubscriptionId": 1 }, { sparse: true });

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.hashPassword);
};

export const User = mongoose.models.User || mongoose.model("User", userSchema);
