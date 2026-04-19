const mongoose = require('mongoose');

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

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
      index: true,
    },
    orderType: {
      type: String,
      enum: ['new_subscription', 'plan_change', 'renewal', 'free_activation'],
      required: true,
    },
    paymentProvider: {
      type: String,
      enum: ['stripe', 'internal'],
      default: 'stripe',
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
      enum: ['pending', 'paid', 'failed', 'canceled', 'refunded'],
      default: 'pending',
      index: true,
    },
    planSnapshot: {
      type: orderPlanSnapshotSchema,
      required: true,
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

module.exports = mongoose.model('Order', orderSchema);
