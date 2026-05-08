import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../utils/api-error.js";
import { User } from "../user/user.model.js";
import Order from "../order/order.model.js";
import { Course } from "../course/course.model.js";
import { CourseEnrollment } from "../course/course-enrollment.model.js";
import { Webinar } from "../webinar/webinar.model.js";
import { WebinarRegistration } from "../webinar/webinar-registration.model.js";

const DAY_FMT = "%Y-%m-%d";

const parseDate = (value, name) => {
  if (!value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${name} must be a valid date.`);
  }
  return d;
};

const defaultRange = () => {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
};

const getRange = (query = {}) => {
  const def = defaultRange();
  const from = parseDate(query.from, "from") || def.from;
  const to = parseDate(query.to, "to") || def.to;
  if (from > to) throw new ApiError(httpStatus.BAD_REQUEST, "from must be <= to.");
  return { from, to };
};

const bucketDaily = (field) => ({
  $dateToString: { format: DAY_FMT, date: field, timezone: "UTC" },
});

const buildSeries = (rows) =>
  rows.map((r) => ({
    date: r._id,
    count: r.count ?? 0,
    amount: r.amount ?? 0,
    currency: r.currency ?? null,
  }));

export const getTotalUserGrowth = async (query) => {
  const { from, to } = getRange(query);

  const [totalToDate, seriesRows] = await Promise.all([
    User.countDocuments({ createdAt: { $lte: to } }),
    User.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: bucketDaily("$createdAt"), count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return {
    range: { from, to },
    totalToDate,
    series: buildSeries(seriesRows),
  };
};

export const getRevenueReport = async (query) => {
  const { from, to } = getRange(query);
  const itemType = query.itemType ? String(query.itemType).trim() : "all";
  const allowed = ["all", "subscription", "course", "webinar", "coaching"];
  if (!allowed.includes(itemType)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `itemType must be one of: ${allowed.join(", ")}.`
    );
  }

  const match = {
    status: "paid",
    paidAt: { $gte: from, $lte: to },
  };
  if (itemType !== "all") match.itemType = itemType;

  const totals = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$currency",
        amount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const seriesRows = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: bucketDaily("$paidAt"),
        amount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    range: { from, to },
    itemType,
    totals: totals.map((t) => ({ currency: t._id, amount: t.amount, count: t.count })),
    series: buildSeries(seriesRows),
  };
};

export const getCoursePerformanceReport = async (query) => {
  const { from, to } = getRange(query);

  const courses = await Course.find({ isDeleted: false }).select("_id title category price currency");

  const [enrollRows, completionRows, revenueRows] = await Promise.all([
    CourseEnrollment.aggregate([
      { $match: { enrolledAt: { $gte: from, $lte: to } } },
      { $group: { _id: "$courseId", enrollments: { $sum: 1 } } },
    ]),
    CourseEnrollment.aggregate([
      { $match: { completedAt: { $ne: null }, completedAt: { $gte: from, $lte: to } } },
      { $group: { _id: "$courseId", completions: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { status: "paid", itemType: "course", paidAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: "$courseId",
          revenue: { $sum: "$amount" },
          currency: { $first: "$currency" },
          purchases: { $sum: 1 },
        },
      },
    ]),
  ]);

  const enrollMap = new Map(enrollRows.map((r) => [String(r._id), r.enrollments]));
  const completionMap = new Map(completionRows.map((r) => [String(r._id), r.completions]));
  const revenueMap = new Map(
    revenueRows.map((r) => [
      String(r._id),
      { revenue: r.revenue, currency: r.currency || null, purchases: r.purchases || 0 },
    ])
  );

  const items = courses.map((c) => {
    const id = String(c._id);
    const enrollments = enrollMap.get(id) || 0;
    const completions = completionMap.get(id) || 0;
    const rev = revenueMap.get(id) || { revenue: 0, currency: c.currency || null, purchases: 0 };
    return {
      courseId: c._id,
      title: c.title,
      category: c.category,
      enrollments,
      completions,
      completionRate: enrollments === 0 ? 0 : Math.round((completions / enrollments) * 100),
      purchases: rev.purchases,
      revenue: rev.revenue,
      currency: rev.currency,
    };
  });

  return { range: { from, to }, items };
};

export const getWebinarPerformanceReport = async (query) => {
  const { from, to } = getRange(query);

  const webinars = await Webinar.find({ isDeleted: false }).select("_id title scheduledAt isPaid currency price");

  const [regRows, paidRows] = await Promise.all([
    WebinarRegistration.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: "$webinarId", registrations: { $sum: 1 } } },
    ]),
    WebinarRegistration.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to }, paymentStatus: "completed" } },
      {
        $group: {
          _id: "$webinarId",
          paidRegistrations: { $sum: 1 },
          revenue: { $sum: "$amount" },
          currency: { $first: "$currency" },
        },
      },
    ]),
  ]);

  const regMap = new Map(regRows.map((r) => [String(r._id), r.registrations]));
  const paidMap = new Map(
    paidRows.map((r) => [
      String(r._id),
      { paidRegistrations: r.paidRegistrations, revenue: r.revenue, currency: r.currency || null },
    ])
  );

  const items = webinars.map((w) => {
    const id = String(w._id);
    const registrations = regMap.get(id) || 0;
    const paid = paidMap.get(id) || { paidRegistrations: 0, revenue: 0, currency: w.currency || null };
    return {
      webinarId: w._id,
      title: w.title,
      scheduledAt: w.scheduledAt,
      registrations,
      paidRegistrations: paid.paidRegistrations,
      revenue: paid.revenue,
      currency: paid.currency,
    };
  });

  return { range: { from, to }, items };
};

export const getCoachingSalesReport = async (query) => {
  const { from, to } = getRange(query);

  // Coaching revenue is captured in Order as itemType=coaching, orderType=coaching_purchase
  const match = {
    status: "paid",
    itemType: "coaching",
    paidAt: { $gte: from, $lte: to },
  };

  const [totals, seriesRows] = await Promise.all([
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$currency",
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: bucketDaily("$paidAt"),
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return {
    range: { from, to },
    totals: totals.map((t) => ({ currency: t._id, amount: t.amount, count: t.count })),
    series: buildSeries(seriesRows),
  };
};

