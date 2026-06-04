import httpStatus from "../../constants/httpStatus.js";
import getStripeClient from "../../config/stripe.js";
import ApiError from "../../utils/api-error.js";
import Order from "../order/order.model.js";
import { sanitizePlan } from "../plan/plan.service.js";
import { Plan } from "../plan/plan.model.js";
import { User } from "../user/user.model.js";

const SUBSCRIPTION_STATUS = {
  INACTIVE: 'inactive',
  PENDING: 'pending',
  ACTIVE: 'active',
  CANCELED: 'canceled',
  PAST_DUE: 'past_due',
};

const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELED: 'canceled',
};

const getPlanSnapshot = (plan) => ({
  name: plan.name,
  description: plan.description,
  price: plan.price,
  currency: plan.currency,
  billingCycle: plan.billingCycle,
  features: plan.features,
  webinarDiscountPercent: plan.webinarDiscountPercent,
});

const sanitizeOrder = (order) => ({
  id: order._id,
  userId: order.userId,
  planId: order.planId,
  orderType: order.orderType,
  paymentProvider: order.paymentProvider,
  amount: order.amount,
  currency: order.currency,
  status: order.status,
  planSnapshot: order.planSnapshot,
  checkoutSessionId: order.checkoutSessionId,
  paymentIntentId: order.paymentIntentId,
  stripeCustomerId: order.stripeCustomerId,
  stripeSubscriptionId: order.stripeSubscriptionId,
  stripeInvoiceId: order.stripeInvoiceId,
  paidAt: order.paidAt,
  failedAt: order.failedAt,
  canceledAt: order.canceledAt,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const sanitizeSubscriptionSnapshot = (subscription) => ({
  status: subscription?.status || SUBSCRIPTION_STATUS.INACTIVE,
  planId: subscription?.planId || null,
  planName: subscription?.planName || null,
  billingCycle: subscription?.billingCycle || null,
  price: subscription?.price || 0,
  currency: subscription?.currency || 'USD',
  features: subscription?.features || [],
  isActive: Boolean(subscription?.isActive),
  startedAt: subscription?.startedAt || null,
  endsAt: subscription?.endsAt || null,
  canceledAt: subscription?.canceledAt || null,
  cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
  orderId: subscription?.orderId || null,
  stripeCustomerId: subscription?.stripeCustomerId || null,
  stripeSubscriptionId: subscription?.stripeSubscriptionId || null,
  stripeCheckoutSessionId: subscription?.stripeCheckoutSessionId || null,
  lastPaymentStatus: subscription?.lastPaymentStatus || null,
});

const getCheckoutBaseUrl = () => {
  return process.env.CLIENT_URL || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || 5000}`;
};

const getPlanById = async (planId, activeOnly = true) => {
  const filter = {
    _id: planId,
    isDeleted: false,
  };

  if (activeOnly) {
    filter.isActive = true;
  }

  const plan = await Plan.findOne(filter);

  if (!plan) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Plan not found.');
  }

  return plan;
};

const getUserById = async (userId) => {
  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found or inactive.');
  }

  return user;
};

const getStripeModeForPlan = (plan) => {
  if (plan.billingCycle === 'Premium Monthly') {
    return 'subscription';
  }

  return 'payment';
};

const getStripeLineItem = (plan) => {
  const unitAmount = Math.round(plan.price * 100);
  const lineItem = {
    price_data: {
      currency: plan.currency.toLowerCase(),
      product_data: {
        name: plan.name,
        description: plan.description || undefined,
      },
      unit_amount: unitAmount,
    },
    quantity: 1,
  };

  if (plan.billingCycle === 'Premium Monthly') {
    lineItem.price_data.recurring = { interval: 'month' };
  }

  return lineItem;
};

const applySubscriptionSnapshot = async ({
  user,
  plan,
  order,
  status,
  stripeCustomerId = null,
  stripeSubscriptionId = null,
  stripeCheckoutSessionId = null,
  startedAt = new Date(),
  endsAt = null,
  lastPaymentStatus = ORDER_STATUS.PAID,
  cancelAtPeriodEnd = false,
  canceledAt = null,
}) => {
  user.subscription = {
    status,
    planId: plan._id,
    planName: plan.name,
    billingCycle: plan.billingCycle,
    price: plan.price,
    currency: plan.currency,
    features: plan.features,
    isActive: status === SUBSCRIPTION_STATUS.ACTIVE,
    startedAt,
    endsAt,
    canceledAt,
    cancelAtPeriodEnd,
    orderId: order?._id || null,
    stripeCustomerId: stripeCustomerId || user.subscription?.stripeCustomerId || null,
    stripeSubscriptionId: stripeSubscriptionId,
    stripeCheckoutSessionId,
    lastPaymentStatus,
  };

  await user.save();
};

const clearUserSubscription = async (user, status = SUBSCRIPTION_STATUS.CANCELED) => {
  user.subscription = {
    status,
    planId: null,
    planName: null,
    billingCycle: null,
    price: 0,
    currency: 'USD',
    features: [],
    isActive: false,
    startedAt: null,
    endsAt: null,
    canceledAt: new Date(),
    cancelAtPeriodEnd: false,
    orderId: null,
    stripeCustomerId: user.subscription?.stripeCustomerId || null,
    stripeSubscriptionId: null,
    stripeCheckoutSessionId: null,
    lastPaymentStatus: status,
  };

  await user.save();
};

const createOrder = async ({ user, plan, orderType, paymentProvider, status, metadata = {} }) => {
  return Order.create({
    userId: user._id,
    planId: plan._id,
    orderType,
    paymentProvider,
    amount: plan.price,
    currency: plan.currency,
    status,
    planSnapshot: getPlanSnapshot(plan),
    metadata,
  });
};

const getPublicPlans = async () => {
  const plans = await Plan.find({
    isDeleted: false,
    isActive: true,
  }).sort({ sortOrder: 1, createdAt: -1 });

  return plans.map(sanitizePlan);
};

const comparePlans = async () => {
  return getPublicPlans();
};

const getCurrentSubscription = async (userId) => {
  const user = await getUserById(userId);

  return sanitizeSubscriptionSnapshot(user.subscription);
};

const getSubscriptionHistory = async (userId) => {
  const orders = await Order.find({ userId }).sort({ createdAt: -1 });

  return orders.map(sanitizeOrder);
};

const ensureFreePlanPrice = (plan) => {
  if (plan.billingCycle === 'free' && plan.price !== 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Free plans must have price 0.');
  }
};

const ensurePaidPlanPrice = (plan) => {
  if (plan.billingCycle !== 'free' && plan.price <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Paid plans must have a price greater than 0.');
  }
};

const createOrReuseStripeCustomer = async (user) => {
  if (user.subscription?.stripeCustomerId) {
    return user.subscription.stripeCustomerId;
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: {
      userId: user._id.toString(),
    },
  });

  user.subscription = {
    ...user.subscription?.toObject?.(),
    ...user.subscription,
    stripeCustomerId: customer.id,
  };
  await user.save();

  return customer.id;
};

const activateFreePlan = async ({ user, plan, orderType }) => {
  ensureFreePlanPrice(plan);

  if (user.subscription?.stripeSubscriptionId) {
    const stripe = getStripeClient();
    try {
      await stripe.subscriptions.cancel(user.subscription.stripeSubscriptionId);
    } catch (error) {
      // Ignore upstream Stripe cancellation failures so free plan activation can still proceed.
    }
  }

  const order = await createOrder({
    user,
    plan,
    orderType,
    paymentProvider: 'internal',
    status: ORDER_STATUS.PAID,
    metadata: { activationType: 'free' },
  });

  order.paidAt = new Date();
  await order.save();

  await applySubscriptionSnapshot({
    user,
    plan,
    order,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    startedAt: new Date(),
    endsAt: null,
    lastPaymentStatus: ORDER_STATUS.PAID,
  });

  return {
    requiresPayment: false,
    order: sanitizeOrder(order),
    subscription: sanitizeSubscriptionSnapshot(user.subscription),
  };
};

const buildStripeCheckoutResponse = (session, order) => ({
  requiresPayment: true,
  checkoutUrl: session.url,
  sessionId: session.id,
  order: sanitizeOrder(order),
});

const startStripeCheckout = async ({ user, plan, orderType }) => {
  ensurePaidPlanPrice(plan);

  const stripe = getStripeClient();
  const customerId = await createOrReuseStripeCustomer(user);
  const order = await createOrder({
    user,
    plan,
    orderType,
    paymentProvider: 'stripe',
    status: ORDER_STATUS.PENDING,
  });

  const baseUrl = getCheckoutBaseUrl();
  const session = await stripe.checkout.sessions.create({
    mode: getStripeModeForPlan(plan),
    customer: customerId,
    client_reference_id: user._id.toString(),
    line_items: [getStripeLineItem(plan)],
    success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/billing/cancel?session_id={CHECKOUT_SESSION_ID}`,
    metadata: {
      orderId: order._id.toString(),
      userId: user._id.toString(),
      planId: plan._id.toString(),
      orderType,
    },
  });

  order.checkoutSessionId = session.id;
  order.stripeCustomerId = customerId;
  order.metadata = {
    ...order.metadata,
    stripeMode: session.mode,
  };
  await order.save();

  await applySubscriptionSnapshot({
    user,
    plan,
    order,
    status: SUBSCRIPTION_STATUS.PENDING,
    stripeCustomerId: customerId,
    stripeCheckoutSessionId: session.id,
    lastPaymentStatus: ORDER_STATUS.PENDING,
  });

  return buildStripeCheckoutResponse(session, order);
};

const checkoutSubscription = async (userId, planId) => {
  const user = await getUserById(userId);
  const plan = await getPlanById(planId, true);

  if (user.subscription?.planId?.toString() === plan._id.toString() && user.subscription?.isActive) {
    throw new ApiError(httpStatus.CONFLICT, 'User is already subscribed to this plan.');
  }

  if (plan.billingCycle === 'free') {
    return activateFreePlan({ user, plan, orderType: 'free_activation' });
  }

  return startStripeCheckout({ user, plan, orderType: 'new_subscription' });
};

const changeSubscriptionPlan = async (userId, planId) => {
  const user = await getUserById(userId);
  const plan = await getPlanById(planId, true);

  if (user.subscription?.planId?.toString() === plan._id.toString() && user.subscription?.isActive) {
    throw new ApiError(httpStatus.CONFLICT, 'User is already subscribed to this plan.');
  }

  if (plan.billingCycle === 'free') {
    return activateFreePlan({ user, plan, orderType: 'plan_change' });
  }

  return startStripeCheckout({ user, plan, orderType: 'plan_change' });
};

const cancelCurrentSubscription = async (userId, reason = '') => {
  const user = await getUserById(userId);

  if (!user.subscription?.planId || !user.subscription?.status || user.subscription.status === SUBSCRIPTION_STATUS.INACTIVE) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No active subscription found.');
  }

  if (user.subscription.stripeSubscriptionId) {
    const stripe = getStripeClient();
    await stripe.subscriptions.cancel(user.subscription.stripeSubscriptionId);
  }

  const order = await Order.findById(user.subscription.orderId);

  if (order && order.status === ORDER_STATUS.PENDING) {
    order.status = ORDER_STATUS.CANCELED;
    order.canceledAt = new Date();
    order.metadata = {
      ...order.metadata,
      cancelReason: reason || null,
    };
    await order.save();
  }

  await clearUserSubscription(user, SUBSCRIPTION_STATUS.CANCELED);

  return sanitizeSubscriptionSnapshot(user.subscription);
};

const completeOrderFromCheckoutSession = async (session, eventId = null) => {
  const orderId = session.metadata?.orderId;

  if (!orderId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Stripe session metadata is missing orderId.');
  }

  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found for Stripe session.');
  }

  if (order.status === ORDER_STATUS.PAID) {
    return sanitizeOrder(order);
  }

  const user = await getUserById(order.userId);
  const plan = await getPlanById(order.planId, false);

  let endsAt = null;
  if (session.mode === 'subscription' && session.subscription) {
    const stripe = getStripeClient();
    const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
    endsAt = stripeSubscription.current_period_end
      ? new Date(stripeSubscription.current_period_end * 1000)
      : null;
  }

  order.status = ORDER_STATUS.PAID;
  order.checkoutSessionId = session.id;
  order.paymentIntentId = session.payment_intent || null;
  order.stripeCustomerId = session.customer || null;
  order.stripeSubscriptionId = session.subscription || null;
  order.paidAt = new Date();
  order.stripeEventId = eventId;
  await order.save();

  await applySubscriptionSnapshot({
    user,
    plan,
    order,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    stripeCustomerId: session.customer || null,
    stripeSubscriptionId: session.subscription || null,
    stripeCheckoutSessionId: session.id,
    startedAt: new Date(),
    endsAt,
    lastPaymentStatus: ORDER_STATUS.PAID,
  });

  return sanitizeOrder(order);
};

const markCheckoutSessionExpired = async (session, eventId = null) => {
  const order = await Order.findOne({ checkoutSessionId: session.id });

  if (!order || order.status !== ORDER_STATUS.PENDING) {
    return null;
  }

  order.status = ORDER_STATUS.CANCELED;
  order.canceledAt = new Date();
  order.stripeEventId = eventId;
  await order.save();

  const user = await User.findById(order.userId);
  if (user && user.subscription?.stripeCheckoutSessionId === session.id && user.subscription?.status === SUBSCRIPTION_STATUS.PENDING) {
    await clearUserSubscription(user, SUBSCRIPTION_STATUS.INACTIVE);
  }

  return sanitizeOrder(order);
};

const upsertInvoiceOrder = async (invoice, status) => {
  const subscriptionId = invoice.subscription || null;
  const user = await User.findOne({
    $or: [
      { 'subscription.stripeSubscriptionId': subscriptionId },
      { 'subscription.stripeCustomerId': invoice.customer || null },
    ],
  });

  if (!user || !user.subscription?.planId) {
    return null;
  }

  const plan = await getPlanById(user.subscription.planId, false);
  const existingOrder = await Order.findOne({ stripeInvoiceId: invoice.id });

  if (existingOrder) {
    existingOrder.status = status;
    existingOrder.paymentIntentId = invoice.payment_intent || existingOrder.paymentIntentId;
    existingOrder.stripeEventId = invoice.id;
    if (status === ORDER_STATUS.PAID) {
      existingOrder.paidAt = new Date();
    } else if (status === ORDER_STATUS.FAILED) {
      existingOrder.failedAt = new Date();
    }
    await existingOrder.save();
    return sanitizeOrder(existingOrder);
  }

  const order = await Order.create({
    userId: user._id,
    planId: plan._id,
    orderType: 'renewal',
    paymentProvider: 'stripe',
    amount: (invoice.amount_paid || invoice.amount_due || 0) / 100,
    currency: (invoice.currency || plan.currency).toUpperCase(),
    status,
    planSnapshot: getPlanSnapshot(plan),
    paymentIntentId: invoice.payment_intent || null,
    stripeCustomerId: invoice.customer || null,
    stripeSubscriptionId: subscriptionId,
    stripeInvoiceId: invoice.id,
    paidAt: status === ORDER_STATUS.PAID ? new Date() : null,
    failedAt: status === ORDER_STATUS.FAILED ? new Date() : null,
    metadata: {
      billingReason: invoice.billing_reason || null,
    },
  });

  if (status === ORDER_STATUS.PAID) {
    user.subscription.status = SUBSCRIPTION_STATUS.ACTIVE;
    user.subscription.isActive = true;
    user.subscription.endsAt = invoice.lines?.data?.[0]?.period?.end
      ? new Date(invoice.lines.data[0].period.end * 1000)
      : user.subscription.endsAt;
    user.subscription.lastPaymentStatus = ORDER_STATUS.PAID;
  }

  if (status === ORDER_STATUS.FAILED) {
    user.subscription.status = SUBSCRIPTION_STATUS.PAST_DUE;
    user.subscription.isActive = false;
    user.subscription.lastPaymentStatus = ORDER_STATUS.FAILED;
  }

  await user.save();

  return sanitizeOrder(order);
};

const handleStripeWebhook = async (event) => {
  switch (event.type) {
    case 'checkout.session.completed':
      return completeOrderFromCheckoutSession(event.data.object, event.id);
    case 'checkout.session.expired':
      return markCheckoutSessionExpired(event.data.object, event.id);
    case 'invoice.payment_succeeded':
      return upsertInvoiceOrder(event.data.object, ORDER_STATUS.PAID);
    case 'invoice.payment_failed':
      return upsertInvoiceOrder(event.data.object, ORDER_STATUS.FAILED);
    case 'customer.subscription.deleted': {
      const stripeSubscriptionId = event.data.object.id;
      const user = await User.findOne({ 'subscription.stripeSubscriptionId': stripeSubscriptionId });
      if (user) {
        await clearUserSubscription(user, SUBSCRIPTION_STATUS.CANCELED);
      }
      return { received: true };
    }
    default:
      return { received: true };
  }
};

const listAdminSubscriptions = async (query) => {
  const filter = {};

  if (query.status) {
    filter['subscription.status'] = query.status;
  }

  if (query.isActive !== undefined) {
    filter['subscription.isActive'] = query.isActive;
  }

  if (query.planId) {
    filter['subscription.planId'] = query.planId;
  }

  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
      { 'subscription.planName': { $regex: query.search, $options: 'i' } },
    ];
  }

  const users = await User.find(filter).sort({ updatedAt: -1 });

  return users.map((user) => ({
    userId: user._id,
    name: user.name,
    email: user.email,
    subscription: sanitizeSubscriptionSnapshot(user.subscription),
  }));
};

const getAdminSubscriptionByUserId = async (userId) => {
  const user = await getUserById(userId);
  const orders = await Order.find({ userId }).sort({ createdAt: -1 });

  return {
    userId: user._id,
    name: user.name,
    email: user.email,
    subscription: sanitizeSubscriptionSnapshot(user.subscription),
    orders: orders.map(sanitizeOrder),
  };
};

const MONTH_FMT = "%Y-%m";
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const billingCycleDisplay = (billingCycle) => {
  switch (billingCycle) {
    case "Premium Monthly":
      return { cycleLabel: "MONTHLY", priceSuffix: "/mo" };
    case "Unlimited Materials":
      return { cycleLabel: "YEARLY", priceSuffix: "/yr" };
    case "free":
      return { cycleLabel: "FREE", priceSuffix: "" };
    default:
      return {
        cycleLabel: String(billingCycle || "PLAN").toUpperCase(),
        priceSuffix: "",
      };
  }
};

const formatMoney = (amount, currency = "USD") => {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
};

const paymentStatusDisplay = (status) => {
  const labels = {
    paid: "Paid",
    failed: "Failed",
    pending: "Pending",
    canceled: "Canceled",
    refunded: "Refunded",
  };
  return { key: status, label: labels[status] || status };
};

const managementChartRange = (query = {}) => {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 5, 1));
  return { from, to };
};

const monthBuckets = (from, to) => {
  const buckets = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  while (cursor <= end) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.push({
      key,
      label: MONTH_LABELS[cursor.getUTCMonth()],
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return buckets;
};

const aggregateSubscriptionRevenueByMonth = async (from, to, currency = null) => {
  const match = {
    itemType: "subscription",
    status: "paid",
    paidAt: { $gte: from, $lte: to },
  };
  if (currency) match.currency = currency;

  const rows = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: MONTH_FMT, date: "$paidAt", timezone: "UTC" } },
        amount: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const map = new Map(rows.map((r) => [r._id, r.amount]));
  return monthBuckets(from, to).map((b) => ({
    month: b.key,
    label: b.label,
    revenue: map.get(b.key) || 0,
  }));
};

const aggregateActiveSubscribersByPlan = async () => {
  const rows = await User.aggregate([
    {
      $match: {
        "subscription.isActive": true,
        "subscription.status": SUBSCRIPTION_STATUS.ACTIVE,
        "subscription.planId": { $ne: null },
      },
    },
    { $group: { _id: "$subscription.planId", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.count]));
};

const sanitizePaymentRowForAdmin = (order, user) => {
  const planName = order.planSnapshot?.name || "—";
  const status = paymentStatusDisplay(order.status);
  return {
    id: order._id,
    userId: order.userId,
    userName: user?.name || null,
    userEmail: user?.email || null,
    planId: order.planId,
    planName,
    amount: order.amount,
    currency: order.currency,
    amountDisplay: formatMoney(order.amount, order.currency),
    status: order.status,
    statusLabel: status.label,
    statusKey: status.key,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
  };
};

/**
 * Single payload for admin Subscription Management page (plans, charts, payments).
 */
const getSubscriptionManagementOverview = async (query = {}) => {
  const { from, to } = managementChartRange(query);
  const currency = query.currency || null;
  const paymentsLimit = query.paymentsLimit || 20;

  const [plans, subscriberMap, revenueSeries, paymentOrders] = await Promise.all([
    Plan.find({ isDeleted: false }).sort({ sortOrder: 1, createdAt: -1 }).lean(),
    aggregateActiveSubscribersByPlan(),
    aggregateSubscriptionRevenueByMonth(from, to, currency),
    Order.find({ itemType: "subscription" })
      .sort({ createdAt: -1 })
      .limit(paymentsLimit)
      .populate("userId", "name email")
      .lean(),
  ]);

  const planCards = plans.map((plan) => {
    const cycle = billingCycleDisplay(plan.billingCycle);
    const activeSubscribers = subscriberMap.get(String(plan._id)) || 0;
    return {
      id: plan._id,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      billingCycleLabel: cycle.cycleLabel,
      priceDisplay: `${formatMoney(plan.price, plan.currency)}${cycle.priceSuffix}`,
      features: plan.features || [],
      recommended: plan.recommended,
      isActive: plan.isActive,
      statusLabel: plan.isActive ? "Live" : "Disabled",
      activeSubscribers,
      sortOrder: plan.sortOrder,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  });

  const analyticsSeries = planCards.map((plan) => ({
    planId: plan.id,
    planName: plan.name,
    subscribers: plan.activeSubscribers,
  }));

  const payments = paymentOrders.map((order) =>
    sanitizePaymentRowForAdmin(order, order.userId)
  );

  return {
    range: { from, to },
    currency: currency || "ALL",
    plans: planCards,
    subscriptionAnalytics: {
      title: "Subscription analytics",
      subtitle: "Subscribers by plan",
      series: analyticsSeries,
    },
    revenuePulse: {
      title: "Revenue pulse",
      subtitle: "Subscription revenue by month",
      series: revenueSeries,
    },
    paymentTracking: {
      title: "Payment tracking",
      subtitle: "Recent subscription charges",
      items: payments,
    },
  };
};

const listAdminPayments = async (query) => {
  const filter = {};

  if (query.itemType) {
    filter.itemType = query.itemType;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.orderType) {
    filter.orderType = query.orderType;
  }

  if (query.userId) {
    filter.userId = query.userId;
  }

  if (query.planId) {
    filter.planId = query.planId;
  }

  if (query.search) {
    filter.$or = [
      { "planSnapshot.name": { $regex: query.search, $options: "i" } },
      { checkoutSessionId: { $regex: query.search, $options: "i" } },
      { paymentIntentId: { $regex: query.search, $options: "i" } },
    ];
  }

  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  const [total, orders] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email")
      .lean(),
  ]);

  return {
    items: orders.map((order) => sanitizePaymentRowForAdmin(order, order.userId)),
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

const getAdminPaymentById = async (orderId) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found.');
  }

  return sanitizeOrder(order);
};

export {
  getPublicPlans,
  comparePlans,
  getCurrentSubscription,
  checkoutSubscription,
  cancelCurrentSubscription,
  changeSubscriptionPlan,
  getSubscriptionHistory,
  handleStripeWebhook,
  getSubscriptionManagementOverview,
  listAdminSubscriptions,
  getAdminSubscriptionByUserId,
  listAdminPayments,
  getAdminPaymentById,
  sanitizeSubscriptionSnapshot,
  sanitizeOrder,
};
