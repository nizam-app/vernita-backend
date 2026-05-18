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

const MONTH_FMT = "%Y-%m";
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pctChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

const sumRevenue = (totals) =>
  totals.reduce((acc, t) => acc + (t.amount || 0), 0);

const monthBuckets = (from, to) => {
  const buckets = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  while (cursor <= end) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.push({
      key,
      label: MONTH_LABELS[cursor.getUTCMonth()],
      start: new Date(cursor),
      end: new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0, 0, 0, -1)),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return buckets;
};

const aggregateRevenueByMonth = async (from, to, currency = null) => {
  const match = {
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
    amount: map.get(b.key) || 0,
  }));
};

const reportsPageRange = (query = {}) => {
  if (query.from || query.to) return getRange(query);
  const to = new Date();
  const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 5, 1));
  return { from, to };
};

/** Cumulative user count at end of each month (line chart trend). */
const aggregateCumulativeUsersByMonth = async (from, to) => {
  const buckets = monthBuckets(from, to);
  const counts = await Promise.all(
    buckets.map((b) =>
      User.countDocuments({
        createdAt: {
          $lte: new Date(
            Date.UTC(b.start.getUTCFullYear(), b.start.getUTCMonth() + 1, 0, 23, 59, 59, 999)
          ),
        },
      })
    )
  );
  return buckets.map((b, i) => ({
    month: b.key,
    label: b.label,
    users: counts[i],
  }));
};

/**
 * Single payload for admin Reports page (4 charts, 6-month default).
 * Query: from, to, currency, top (max courses/webinars, default 10).
 */
export const getReportsPageOverview = async (query = {}) => {
  const { from, to } = reportsPageRange(query);
  const currency = query.currency ? String(query.currency).trim().toUpperCase() : null;
  const top = Math.min(50, Math.max(1, Number.parseInt(String(query.top || "10"), 10) || 10));

  const [userGrowthSeries, revenueSeries, courseReport, webinarReport] = await Promise.all([
    aggregateCumulativeUsersByMonth(from, to),
    aggregateRevenueByMonth(from, to, currency),
    getCoursePerformanceReport({ from, to }),
    getWebinarPerformanceReport({ from, to }),
  ]);

  const courseItems = [...courseReport.items]
    .sort((a, b) => b.enrollments - a.enrollments)
    .slice(0, top)
    .map((c) => ({
      courseId: c.courseId,
      title: c.title,
      label: c.title,
      enrollments: c.enrollments,
      revenue: c.revenue,
      currency: c.currency,
    }));

  const webinarItems = [...webinarReport.items]
    .filter((w) => w.registrations > 0)
    .sort((a, b) => b.registrations - a.registrations)
    .slice(0, top)
    .map((w) => ({
      webinarId: w.webinarId,
      title: w.title,
      label: w.title,
      registrations: w.registrations,
      paidRegistrations: w.paidRegistrations,
      revenue: w.revenue,
      currency: w.currency,
    }));

  return {
    range: { from, to },
    currency: currency || "ALL",
    userGrowth: {
      title: "User growth",
      subtitle: "Six month trend",
      series: userGrowthSeries,
    },
    revenueReport: {
      title: "Revenue report",
      subtitle: "Gross revenue by month",
      series: revenueSeries.map((r) => ({
        month: r.month,
        label: r.label,
        revenue: r.amount,
        amount: r.amount,
      })),
    },
    coursePerformance: {
      title: "Course performance",
      subtitle: "Enrollments & modeled revenue",
      items: courseItems,
    },
    webinarPerformance: {
      title: "Webinar performance",
      subtitle: "Registrations per session",
      items: webinarItems,
    },
  };
};

/**
 * Single payload for admin dashboard UI (replaces mock/static data).
 * Query: from, to (ISO dates). Defaults: trailing 30 days.
 * Optional: currency (filters paid orders to one currency for revenue KPIs/charts).
 */
const dashboardChartRange = (query) => {
  if (query.from || query.to) return getRange(query);
  const to = new Date();
  const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 5, 1));
  return { from, to };
};

const trailing30Days = () => {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
};

const calendarMonthRange = (offsetMonths = 0) => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths + 1, 0, 23, 59, 59, 999));
  return { from: start, to: end };
};

export const getAdminDashboard = async (query = {}) => {
  const { from, to } = dashboardChartRange(query);
  const currency = query.currency ? String(query.currency).trim().toUpperCase() : null;
  const revenueWindow = trailing30Days();
  const thisMonth = calendarMonthRange(0);
  const lastMonth = calendarMonthRange(-1);

  const paidMatch = (range) => ({
    status: "paid",
    paidAt: { $gte: range.from, $lte: range.to },
    ...(currency ? { currency } : {}),
  });

  const [
    totalUsers,
    usersThisMonth,
    usersLastMonth,
    activeSubscriptions,
    planLeader,
    webinarRegsCurrent,
    nextWebinar,
    courseEnrollCurrent,
    topCourse,
    coachingOrdersCurrent,
    revenueTotalsCurrent,
    revenueByType,
    revenueByMonth,
    usersByMonth,
  ] = await Promise.all([
    User.countDocuments({ createdAt: { $lte: to } }),
    User.countDocuments({ createdAt: { $gte: thisMonth.from, $lte: thisMonth.to } }),
    User.countDocuments({ createdAt: { $gte: lastMonth.from, $lte: lastMonth.to } }),
    User.countDocuments({
      "subscription.isActive": true,
      "subscription.status": "active",
    }),
    User.aggregate([
      { $match: { "subscription.isActive": true, "subscription.planName": { $ne: null } } },
      { $group: { _id: "$subscription.planName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]),
    WebinarRegistration.countDocuments({
      createdAt: { $gte: from, $lte: to },
      registrationStatus: { $in: ["registered", "pending_payment"] },
    }),
    Webinar.findOne({
      isDeleted: false,
      isPublished: true,
      scheduledAt: { $gte: new Date() },
      status: { $in: ["upcoming", "live"] },
    })
      .sort({ scheduledAt: 1 })
      .select("title scheduledAt"),
    CourseEnrollment.countDocuments({ enrolledAt: { $gte: from, $lte: to } }),
    CourseEnrollment.aggregate([
      { $match: { enrolledAt: { $gte: from, $lte: to } } },
      { $group: { _id: "$courseId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]),
    Order.aggregate([
      { $match: { ...paidMatch(revenueWindow), itemType: "coaching" } },
      { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: "$amount" } } },
    ]),
    Order.aggregate([
      { $match: paidMatch(revenueWindow) },
      {
        $group: {
          _id: "$currency",
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      { $match: paidMatch({ from, to }) },
      {
        $group: {
          _id: "$itemType",
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
    aggregateRevenueByMonth(from, to, currency),
    User.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { $dateToString: { format: MONTH_FMT, date: "$createdAt", timezone: "UTC" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  let topCourseDoc = null;
  if (topCourse.length && topCourse[0]._id) {
    topCourseDoc = await Course.findById(topCourse[0]._id).select("title");
  }

  const coachingCount = coachingOrdersCurrent[0]?.count || 0;
  const coachingRevenue = coachingOrdersCurrent[0]?.revenue || 0;
  const avgTicket = coachingCount > 0 ? Math.round((coachingRevenue / coachingCount) * 100) / 100 : 0;

  const revenueTotal = sumRevenue(
    revenueTotalsCurrent.map((t) => ({ amount: t.amount }))
  );

  const salesBreakdown = {
    coaching: revenueByType.find((r) => r._id === "coaching")?.amount || 0,
    courses: revenueByType.find((r) => r._id === "course")?.amount || 0,
    subscriptions: revenueByType.find((r) => r._id === "subscription")?.amount || 0,
    webinars: revenueByType.find((r) => r._id === "webinar")?.amount || 0,
  };

  const userGrowthSeries = monthBuckets(from, to).map((b) => {
    const row = usersByMonth.find((u) => u._id === b.key);
    return {
      month: b.key,
      label: b.label,
      signups: row?.count || 0,
    };
  });

  const revenueGrowthSeries = monthBuckets(from, to).map((b) => {
    const row = revenueByMonth.find((r) => r.month === b.key);
    return {
      month: b.key,
      label: b.label,
      revenue: row?.amount || 0,
    };
  });

  return {
    range: { from, to },
    currency: currency || "ALL",
    kpis: {
      totalUsers: {
        value: totalUsers,
        changePercent: pctChange(usersThisMonth, usersLastMonth),
        periodLabel: "vs last month",
      },
      activeSubscriptions: {
        value: activeSubscriptions,
        leadingPlan: planLeader[0]?._id || null,
        leadingPlanName: planLeader[0]?._id || null,
        leadingPlanShare:
          activeSubscriptions && planLeader[0]
            ? Math.round((planLeader[0].count / activeSubscriptions) * 100)
            : 0,
      },
      webinarRegistrations: {
        value: webinarRegsCurrent,
        nextWebinar: nextWebinar
          ? { id: nextWebinar._id, title: nextWebinar.title, scheduledAt: nextWebinar.scheduledAt }
          : null,
      },
      courseEnrollments: {
        value: courseEnrollCurrent,
        topCourse: topCourseDoc
          ? { id: topCourseDoc._id, title: topCourseDoc.title, enrollments: topCourse[0].count }
          : null,
      },
      coachingPurchases: {
        value: coachingCount,
        averageTicket: avgTicket,
        currency: currency || "USD",
      },
      revenueSummary: {
        value: revenueTotal,
        currency: currency || revenueTotalsCurrent[0]?._id || "USD",
        periodLabel: "Trailing 30 days",
        range: revenueWindow,
      },
    },
    charts: {
      revenueGrowth: {
        title: "Revenue growth",
        subtitle: "Net revenue across all products",
        series: revenueGrowthSeries,
      },
      salesBreakdown: {
        title: "Sales breakdown",
        subtitle: "Share by product line",
        ...salesBreakdown,
      },
      userGrowth: {
        title: "User growth",
        subtitle: "New signups by month",
        series: userGrowthSeries,
      },
    },
  };
};

