import mongoose from "mongoose";

const orderPlanSnapshotSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    billingCycle: {
      type: String,
      required: true,
    },
    features: {
      type: [String],
      default: [],
    },
    webinarDiscountPercent: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const orderItemSnapshotSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    itemType: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  }
);

const orderSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: ["subscription", "course", "webinar", "coaching"],
      default: "subscription",
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
      index: true,
    },
    orderType: {
      type: String,
      enum: [
        "new_subscription",
        "plan_change",
        "renewal",
        "free_activation",
        "course_purchase",
        "coaching_purchase",
        "webinar_purchase",
      ],
      required: true,
    },
    paymentProvider: {
      type: String,
      enum: ["stripe", "internal", "manual"],
      default: "stripe",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "canceled", "refunded"],
      default: "pending",
      index: true,
    },
    planSnapshot: {
      type: orderPlanSnapshotSchema,
      default: null,
    },
    itemSnapshot: {
      type: orderItemSnapshotSchema,
      default: null,
    },
    checkoutSessionId: {
      type: String,
      default: null,
      index: true,
    },
    paymentIntentId: {
      type: String,
      default: null,
      index: true,
    },
    stripeCustomerId: {
      type: String,
      default: null,
      index: true,
    },
    stripeSubscriptionId: {
      type: String,
      default: null,
      index: true,
    },
    stripeInvoiceId: {
      type: String,
      default: null,
      index: true,
    },
    stripeEventId: {
      type: String,
      default: null,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    paidAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    canceledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;
