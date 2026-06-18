import AppError from "../../utils/AppError.js";
import { CoachingPurchase } from "../coaching/coachingPurchase.model.js";
import { CourseEnrollment } from "../course/course-enrollment.model.js";
import { LessonProgress } from "../course/lesson-progress.model.js";
import { SelfCareEntry } from "../tracker/selfCare/selfCare.model.js";
import { WebinarRegistration } from "../webinar/webinar-registration.model.js";
import { User } from "./user.model.js";

const toUtcDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
};

export const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name || null,
  email: user.email || null,
  phone: user.phone || null,
  role: user.role,
  isActive: user.isActive,
  isBlocked: user.isBlocked,
  subscription: user.subscription || null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const getUserById = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return sanitizeUser(user);
};

/**
 * Profile screen: user identity + Courses / Lessons / Days stat cards.
 */
export const getProfileDashboard = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const [enrollmentStats, selfCareEntries, completedLessons] = await Promise.all([
    CourseEnrollment.aggregate([
      {
        $match: {
          userId,
          paymentStatus: { $in: ["paid", "free"] },
        },
      },
      {
        $group: {
          _id: null,
          coursesCount: { $sum: 1 },
          lessonsCompleted: { $sum: "$completedLessonsCount" },
        },
      },
    ]),
    SelfCareEntry.find({ userId, isDeleted: false }).select("entryDate").lean(),
    LessonProgress.find({ userId, isCompleted: true, completedAt: { $ne: null } })
      .select("completedAt")
      .lean(),
  ]);

  const statsRow = enrollmentStats[0] || { coursesCount: 0, lessonsCompleted: 0 };
  const activeDayKeys = new Set();

  for (const entry of selfCareEntries) {
    const key = toUtcDateKey(entry.entryDate);
    if (key) activeDayKeys.add(key);
  }

  for (const progress of completedLessons) {
    const key = toUtcDateKey(progress.completedAt);
    if (key) activeDayKeys.add(key);
  }

  return {
    profile: sanitizeUser(user),
    stats: {
      coursesCount: statsRow.coursesCount,
      lessonsCompleted: statsRow.lessonsCompleted,
      activeDays: activeDayKeys.size,
    },
  };
};

/**
 * Admin user profile modal: identity + enrolled courses, webinars, coaching (authentic relations).
 */
export const getUserDetailForAdmin = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const uid = user._id;

  const [enrollments, webinarRegs, coachingPurchases] = await Promise.all([
    CourseEnrollment.find({ userId: uid, paymentStatus: { $in: ["paid", "free"] } })
      .populate({ path: "courseId", select: "title isDeleted" })
      .sort({ enrolledAt: -1 })
      .lean(),
    WebinarRegistration.find({
      userId: uid,
      registrationStatus: { $in: ["registered", "pending_payment"] },
    })
      .populate({ path: "webinarId", select: "title isDeleted" })
      .sort({ createdAt: -1 })
      .lean(),
    CoachingPurchase.find({
      userId: uid,
      purchaseStatus: { $ne: "canceled" },
      paymentStatus: { $nin: ["failed", "refunded"] },
    })
      .populate({ path: "coachingPackageId", select: "title isDeleted" })
      .sort({ purchasedAt: -1 })
      .lean(),
  ]);

  const enrolledCourses = enrollments
    .filter((e) => e.courseId && !e.courseId.isDeleted)
    .map((e) => ({ id: e.courseId._id, title: e.courseId.title }));

  const webinarRegistrations = webinarRegs
    .filter((r) => r.webinarId && !r.webinarId.isDeleted)
    .map((r) => ({ id: r.webinarId._id, title: r.webinarId.title }));

  const coachingPackages = coachingPurchases
    .filter((p) => p.coachingPackageId && !p.coachingPackageId.isDeleted)
    .map((p) => ({
      id: p.coachingPackageId._id,
      title: p.coachingPackageId.title,
      purchaseId: p._id,
      paymentStatus: p.paymentStatus,
      purchaseStatus: p.purchaseStatus,
    }));

  const subDisplay = subscriptionDisplayForAdmin(user.subscription);

  return {
    id: user._id,
    name: user.name || null,
    email: user.email || null,
    profileImageUrl: null,
    accountActive: Boolean(user.isActive && !user.isBlocked),
    accountStatusLabel: user.isActive && !user.isBlocked ? "Active" : "Inactive",
    role: user.role,
    subscription: {
      status: user.subscription?.status ?? "inactive",
      isActive: Boolean(user.subscription?.isActive),
      planName: user.subscription?.planName ?? null,
      display: subDisplay.label,
      displayKey: subDisplay.key,
    },
    enrolledCourses,
    webinarRegistrations,
    coachingPackages,
    counts: {
      enrolledCourses: enrolledCourses.length,
      webinarRegistrations: webinarRegistrations.length,
      coachingPackages: coachingPackages.length,
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export const getUsers = async () => {
  const users = await User.find().sort({ createdAt: -1 });

  return users.map(sanitizeUser);
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Maps stored subscription fields to admin table badge labels (see user subscription schema). */
export const subscriptionDisplayForAdmin = (subscription) => {
  if (!subscription) return { key: "none", label: "None" };
  const status = subscription.status || "inactive";
  const isActive = Boolean(subscription.isActive);
  if (status === "past_due") return { key: "past_due", label: "Past due" };
  if (status === "active" && isActive) return { key: "active", label: "Active" };
  if (status === "active" && !isActive) return { key: "inactive", label: "Inactive" };
  if (status === "pending") return { key: "trial", label: "Trial" };
  if (status === "canceled") return { key: "canceled", label: "Canceled" };
  if (status === "inactive") return { key: "none", label: "None" };
  return { key: status, label: status };
};

/**
 * Paginated user list for admin user management UI (search, counts, subscription badge).
 * Query: page, limit, search (name/email), role (optional: "user" | "admin").
 */
export const listUsersForAdmin = async (query = {}) => {
  const page = Math.max(1, Number.parseInt(String(query.page || "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(query.limit || "20"), 10) || 20));
  const skip = (page - 1) * limit;
  const search = query.search ? String(query.search).trim() : "";

  const filter = {};
  if (query.role === "admin" || query.role === "user") {
    filter.role = query.role;
  }
  if (search) {
    filter.$or = [
      { name: { $regex: escapeRegex(search), $options: "i" } },
      { email: { $regex: escapeRegex(search), $options: "i" } },
    ];
  }

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  const userIds = users.map((u) => u._id);
  const enrollCounts =
    userIds.length === 0
      ? []
      : await CourseEnrollment.aggregate([
          {
            $match: {
              userId: { $in: userIds },
              paymentStatus: { $in: ["paid", "free"] },
            },
          },
          { $group: { _id: "$userId", count: { $sum: 1 } } },
        ]);

  const countMap = new Map(enrollCounts.map((r) => [String(r._id), r.count]));

  const items = users.map((u) => {
    const subDisplay = subscriptionDisplayForAdmin(u.subscription);
    return {
      id: u._id,
      name: u.name || null,
      email: u.email || null,
      avatarUrl: null,
      subscription: {
        status: u.subscription?.status ?? "inactive",
        isActive: Boolean(u.subscription?.isActive),
        planName: u.subscription?.planName ?? null,
        display: subDisplay.label,
        displayKey: subDisplay.key,
      },
      coursesEnrolled: countMap.get(String(u._id)) || 0,
      accountActive: Boolean(u.isActive && !u.isBlocked),
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  });

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

export const updateUserById = async (userId, payload) => {
  const updates = {};

  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.email !== undefined) {
    updates.email = payload.email ? String(payload.email).trim().toLowerCase() : null;
  }
  if (payload.phone !== undefined) {
    updates.phone = payload.phone ? String(payload.phone).trim() : null;
  }
  if (payload.role !== undefined) updates.role = payload.role;
  if (payload.isActive !== undefined) updates.isActive = payload.isActive;
  if (payload.isBlocked !== undefined) updates.isBlocked = payload.isBlocked;

  const user = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return sanitizeUser(user);
};

export const deleteUserById = async (userId) => {
  const user = await User.findByIdAndDelete(userId);

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return sanitizeUser(user);
};
