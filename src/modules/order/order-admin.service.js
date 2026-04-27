import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../utils/api-error.js";
import Order from "./order.model.js";

const buildMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

const toSortOrder = (sortOrder) =>
  sortOrder === "desc" || sortOrder === "-1" ? -1 : 1;

const sanitizeOrder = (order) => ({
  id: order._id,
  itemType: order.itemType,
  userId: order.userId,
  planId: order.planId,
  courseId: order.courseId,
  orderType: order.orderType,
  paymentProvider: order.paymentProvider,
  amount: order.amount,
  currency: order.currency,
  status: order.status,
  planSnapshot: order.planSnapshot,
  itemSnapshot: order.itemSnapshot,
  checkoutSessionId: order.checkoutSessionId,
  paymentIntentId: order.paymentIntentId,
  stripeCustomerId: order.stripeCustomerId,
  stripeSubscriptionId: order.stripeSubscriptionId,
  stripeInvoiceId: order.stripeInvoiceId,
  stripeEventId: order.stripeEventId,
  metadata: order.metadata,
  paidAt: order.paidAt,
  failedAt: order.failedAt,
  canceledAt: order.canceledAt,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const buildFilter = (query) => {
  const filter = {};

  if (query.itemType) filter.itemType = query.itemType;
  if (query.status) filter.status = query.status;
  if (query.orderType) filter.orderType = query.orderType;
  if (query.paymentProvider) filter.paymentProvider = query.paymentProvider;
  if (query.userId) filter.userId = query.userId;
  if (query.planId) filter.planId = query.planId;
  if (query.courseId) filter.courseId = query.courseId;

  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    filter.amount = {};
    if (query.minAmount !== undefined) filter.amount.$gte = query.minAmount;
    if (query.maxAmount !== undefined) filter.amount.$lte = query.maxAmount;
  }

  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = query.dateFrom;
    if (query.dateTo) filter.createdAt.$lte = query.dateTo;
  }

  if (query.search) {
    filter.$or = [
      { "planSnapshot.name": { $regex: query.search, $options: "i" } },
      { "itemSnapshot.title": { $regex: query.search, $options: "i" } },
      { checkoutSessionId: { $regex: query.search, $options: "i" } },
      { paymentIntentId: { $regex: query.search, $options: "i" } },
      { stripeInvoiceId: { $regex: query.search, $options: "i" } },
    ];
  }

  return filter;
};

export const listAdminOrders = async (query) => {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 200);
  const skip = (page - 1) * limit;

  const filter = buildFilter(query);

  const sortBy = query.sortBy || "createdAt";
  const sortOrder = toSortOrder(query.sortOrder || "desc");
  const sort = { [sortBy]: sortOrder, createdAt: -1 };

  const [total, orders] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email role"),
  ]);

  return {
    meta: buildMeta({ page, limit, total }),
    data: orders.map((order) => ({
      ...sanitizeOrder(order),
      user: order.userId,
    })),
  };
};

export const getAdminOrderById = async (orderId) => {
  const order = await Order.findById(orderId).populate("userId", "name email role");
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");

  return {
    ...sanitizeOrder(order),
    user: order.userId,
  };
};

export const getAdminRevenueReport = async (query) => {
  const match = {
    status: "paid",
  };

  if (query.itemType) {
    match.itemType = query.itemType;
  }

  if (query.dateFrom || query.dateTo) {
    match.paidAt = {};
    if (query.dateFrom) match.paidAt.$gte = query.dateFrom;
    if (query.dateTo) match.paidAt.$lte = query.dateTo;
  }

  const base = [{ $match: match }];

  // Always compute overall totals
  const totalPipeline = [
    ...base,
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$amount" },
        totalPaidOrders: { $sum: 1 },
        currencies: { $addToSet: "$currency" },
      },
    },
    {
      $project: {
        _id: 0,
        totalRevenue: 1,
        totalPaidOrders: 1,
        currencies: 1,
      },
    },
  ];

  let breakdownPipeline = null;
  if (query.groupBy === "itemType") {
    breakdownPipeline = [
      ...base,
      {
        $group: {
          _id: "$itemType",
          revenue: { $sum: "$amount" },
          paidOrders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      {
        $project: {
          _id: 0,
          key: "$_id",
          revenue: 1,
          paidOrders: 1,
        },
      },
    ];
  }

  if (query.groupBy === "day") {
    breakdownPipeline = [
      ...base,
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$paidAt" },
          },
          revenue: { $sum: "$amount" },
          paidOrders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          key: "$_id",
          revenue: 1,
          paidOrders: 1,
        },
      },
    ];
  }

  if (query.groupBy === "month") {
    breakdownPipeline = [
      ...base,
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$paidAt" },
          },
          revenue: { $sum: "$amount" },
          paidOrders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          key: "$_id",
          revenue: 1,
          paidOrders: 1,
        },
      },
    ];
  }

  const [totals, breakdown] = await Promise.all([
    Order.aggregate(totalPipeline),
    breakdownPipeline ? Order.aggregate(breakdownPipeline) : Promise.resolve([]),
  ]);

  return {
    totals: totals[0] || { totalRevenue: 0, totalPaidOrders: 0, currencies: [] },
    breakdown,
  };
};

