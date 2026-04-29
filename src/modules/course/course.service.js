import httpStatus from "../../constants/httpStatus.js";
import getStripeClient from "../../config/stripe.js";
import ApiError from "../../utils/api-error.js";
import { deleteCloudinaryAsset, deleteImage } from "../../services/upload.service.js";
import Order from "../order/order.model.js";
import { User } from "../user/user.model.js";
import { Course } from "./course.model.js";
import { CourseEnrollment } from "./course-enrollment.model.js";
import { Lesson } from "./lesson.model.js";
import { LessonProgress } from "./lesson-progress.model.js";

const normalizeString = (value) => String(value || "").trim();
const COURSE_ACCESS_PAYMENT_STATUSES = ["free", "paid"];

const normalizeCoursePayload = (payload) => {
  const normalized = { ...payload };

  for (const field of [
    "title",
    "description",
    "bannerImage",
    "bannerImagePublicId",
    "category",
    "instructorName",
    "instructorTitle",
    "instructorBio",
    "level",
    "durationText",
    "accessType",
    "currency",
    "status",
  ]) {
    if (normalized[field] !== undefined) normalized[field] = normalizeString(normalized[field]);
  }

  if (normalized.currency !== undefined) normalized.currency = normalized.currency.toUpperCase();
  if (normalized.tags !== undefined) {
    normalized.tags = normalized.tags.map((tag) => normalizeString(tag)).filter(Boolean);
  }
  if (normalized.accessType === "free") normalized.price = 0;
  if (normalized.isPublished === true) normalized.status = "published";
  if (normalized.status === "published") normalized.isPublished = true;
  if (normalized.status === "draft" || normalized.status === "archived") {
    normalized.isPublished = false;
  }

  return normalized;
};

const normalizeLessonPayload = (payload) => {
  const normalized = { ...payload };

  for (const field of [
    "title",
    "summary",
    "videoUrl",
    "videoDurationText",
    "videoPublicId",
    "videoAssetResourceType",
  ]) {
    if (normalized[field] !== undefined) normalized[field] = normalizeString(normalized[field]);
  }
  if (normalized.resources !== undefined) {
    normalized.resources = normalized.resources.map((resource) => ({
      title: normalizeString(resource.title),
      type: normalizeString(resource.type),
      url: normalizeString(resource.url),
      assetPublicId: normalizeString(resource.assetPublicId),
      assetResourceType: normalizeString(resource.assetResourceType) || "raw",
    }));
  }

  return normalized;
};

/** Ensures new lesson does not violate unique index { courseId, sortOrder }. */
const resolveLessonSortOrder = async (courseId, requestedSortOrder) => {
  const order =
    typeof requestedSortOrder === "number" && Number.isFinite(requestedSortOrder)
      ? requestedSortOrder
      : 0;

  const clash = await Lesson.findOne({ courseId, sortOrder: order }).select("_id").lean();
  if (!clash) return order;

  const last = await Lesson.findOne({ courseId }).sort({ sortOrder: -1 }).select("sortOrder").lean();
  return (last?.sortOrder ?? -1) + 1;
};

const buildMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

const buildCourseFilter = (query, { publicOnly = false } = {}) => {
  const filter = { isDeleted: false };

  if (publicOnly) {
    filter.isPublished = true;
    filter.status = "published";
  }

  if (query.category) filter.category = query.category;
  if (query.accessType) filter.accessType = query.accessType;
  if (query.level) filter.level = query.level;
  if (query.status && !publicOnly) filter.status = query.status;
  if (query.isPublished !== undefined && !publicOnly) filter.isPublished = query.isPublished;
  if (query.isFeatured !== undefined) filter.isFeatured = query.isFeatured;
  if (query.featured !== undefined) filter.isFeatured = query.featured;
  if (query.freeOnly === true) filter.accessType = "free";
  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: "i" } },
      { description: { $regex: query.search, $options: "i" } },
      { category: { $regex: query.search, $options: "i" } },
      { instructorName: { $regex: query.search, $options: "i" } },
    ];
  }

  return filter;
};

const buildSort = (query) => ({
  [query.sortBy || "createdAt"]: query.sortOrder ?? -1,
});

const ensureCourseExists = async (courseId, { publicOnly = false } = {}) => {
  const filter = { _id: courseId, isDeleted: false };
  if (publicOnly) {
    filter.isPublished = true;
    filter.status = "published";
  }

  const course = await Course.findOne(filter);
  if (!course) throw new ApiError(httpStatus.NOT_FOUND, "Course not found.");

  return course;
};

const ensureLessonExists = async (lessonId) => {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new ApiError(httpStatus.NOT_FOUND, "Lesson not found.");

  return lesson;
};

const getEnrollment = async (courseId, userId) => {
  return CourseEnrollment.findOne({ courseId, userId });
};

const ensureEnrollmentCanAccessContent = async (courseId, userId) => {
  const enrollment = await getEnrollment(courseId, userId);

  if (!enrollment) {
    throw new ApiError(httpStatus.FORBIDDEN, "You must enroll in this course first.");
  }

  if (!COURSE_ACCESS_PAYMENT_STATUSES.includes(enrollment.paymentStatus)) {
    throw new ApiError(httpStatus.FORBIDDEN, "Course payment is not completed yet.");
  }

  return enrollment;
};

const recalculateLessonCount = async (courseId) => {
  const lessonsCount = await Lesson.countDocuments({ courseId });
  await Course.findByIdAndUpdate(courseId, { lessonsCount });
};

const recalculateCourseProgress = async (courseId, userId) => {
  const totalPublishedLessons = await Lesson.countDocuments({
    courseId,
    isPublished: true,
  });
  const completedLessonsCount = await LessonProgress.countDocuments({
    courseId,
    userId,
    isCompleted: true,
  });
  const progressPercent =
    totalPublishedLessons === 0
      ? 0
      : Math.min(100, Math.round((completedLessonsCount / totalPublishedLessons) * 100));

  const isCompleted = totalPublishedLessons > 0 && completedLessonsCount >= totalPublishedLessons;

  const enrollment = await CourseEnrollment.findOneAndUpdate(
    { courseId, userId },
    {
      completedLessonsCount,
      progressPercent,
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
    },
    { new: true }
  );

  return enrollment;
};

const sanitizeCourse = (course) => ({
  id: course._id,
  title: course.title,
  description: course.description,
  bannerImage: course.bannerImage,
  category: course.category,
  tags: course.tags || [],
  instructorName: course.instructorName,
  instructorTitle: course.instructorTitle,
  instructorBio: course.instructorBio,
  level: course.level,
  durationText: course.durationText,
  durationInWeeks: course.durationInWeeks,
  lessonsCount: course.lessonsCount,
  studentCount: course.studentCount,
  rating: course.rating,
  reviewsCount: course.reviewsCount,
  certificateEnabled: course.certificateEnabled,
  accessType: course.accessType,
  price: course.price,
  currency: course.currency,
  isFeatured: course.isFeatured,
  isPublished: course.isPublished,
  status: course.status,
  createdBy: course.createdBy,
  updatedBy: course.updatedBy,
  createdAt: course.createdAt,
  updatedAt: course.updatedAt,
});

const sanitizeAdminCourse = (course) => ({
  ...sanitizeCourse(course),
  isDeleted: course.isDeleted,
  deletedAt: course.deletedAt,
});

const sanitizeLesson = (lesson, { includeContent = true } = {}) => ({
  id: lesson._id,
  courseId: lesson.courseId,
  title: lesson.title,
  summary: lesson.summary,
  videoUrl: includeContent ? lesson.videoUrl : "",
  videoDurationText: lesson.videoDurationText,
  videoDurationSeconds: lesson.videoDurationSeconds,
  resources: includeContent
    ? (lesson.resources || []).map((r) => ({
        title: r.title,
        type: r.type,
        url: r.url,
      }))
    : [],
  sortOrder: lesson.sortOrder,
  isPreview: lesson.isPreview,
  isPublished: lesson.isPublished,
  createdAt: lesson.createdAt,
  updatedAt: lesson.updatedAt,
});

const sanitizeEnrollment = (enrollment) => ({
  id: enrollment._id,
  courseId: enrollment.courseId,
  userId: enrollment.userId,
  accessType: enrollment.accessType,
  paymentStatus: enrollment.paymentStatus,
  orderId: enrollment.orderId,
  enrolledAt: enrollment.enrolledAt,
  progressPercent: enrollment.progressPercent,
  completedLessonsCount: enrollment.completedLessonsCount,
  isCompleted: enrollment.isCompleted,
  completedAt: enrollment.completedAt,
  createdAt: enrollment.createdAt,
  updatedAt: enrollment.updatedAt,
});

const sanitizeProgress = (progress) => ({
  id: progress._id,
  courseId: progress.courseId,
  lessonId: progress.lessonId,
  userId: progress.userId,
  watchedSeconds: progress.watchedSeconds,
  isCompleted: progress.isCompleted,
  completedAt: progress.completedAt,
  createdAt: progress.createdAt,
  updatedAt: progress.updatedAt,
});

const sanitizeOrder = (order) => ({
  id: order._id,
  itemType: order.itemType,
  userId: order.userId,
  courseId: order.courseId,
  orderType: order.orderType,
  paymentProvider: order.paymentProvider,
  amount: order.amount,
  currency: order.currency,
  status: order.status,
  itemSnapshot: order.itemSnapshot,
  checkoutSessionId: order.checkoutSessionId,
  paymentIntentId: order.paymentIntentId,
  stripeCustomerId: order.stripeCustomerId,
  paidAt: order.paidAt,
  failedAt: order.failedAt,
  canceledAt: order.canceledAt,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const getCheckoutBaseUrl = () => {
  return process.env.CLIENT_URL || `http://${process.env.HOST || "localhost"}:${process.env.PORT || 5000}`;
};

const createOrReuseStripeCustomer = async (user) => {
  if (user.subscription?.stripeCustomerId) return user.subscription.stripeCustomerId;

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

const buildCourseLineItem = (course) => ({
  price_data: {
    currency: course.currency.toLowerCase(),
    product_data: {
      name: course.title,
      description: course.description || undefined,
    },
    unit_amount: Math.round(course.price * 100),
  },
  quantity: 1,
});

const createCourseOrder = async ({ user, course, enrollment }) => {
  return Order.create({
    itemType: "course",
    userId: user._id,
    courseId: course._id,
    orderType: "course_purchase",
    paymentProvider: "stripe",
    amount: course.price,
    currency: course.currency,
    status: "pending",
    itemSnapshot: {
      title: course.title,
      description: course.description,
      price: course.price,
      currency: course.currency,
      itemType: "course",
    },
    metadata: {
      enrollmentId: enrollment._id.toString(),
    },
  });
};

export const createCourse = async (payload, adminUserId) => {
  const course = await Course.create({
    ...normalizeCoursePayload(payload),
    createdBy: adminUserId || null,
    updatedBy: adminUserId || null,
  });

  return sanitizeAdminCourse(course);
};

export const getAdminCourses = async (query) => {
  const filter = buildCourseFilter(query);
  const total = await Course.countDocuments(filter);
  const courses = await Course.find(filter)
    .sort(buildSort(query))
    .skip((query.page - 1) * query.limit)
    .limit(query.limit);

  return {
    items: courses.map(sanitizeAdminCourse),
    meta: buildMeta({ page: query.page, limit: query.limit, total }),
  };
};

export const getAdminCourseById = async (courseId) => {
  const course = await ensureCourseExists(courseId);
  const lessons = await Lesson.find({ courseId }).sort({ sortOrder: 1 });

  return {
    ...sanitizeAdminCourse(course),
    lessons: lessons.map((lesson) => sanitizeLesson(lesson)),
  };
};

export const getCourseEnrollments = async (courseId) => {
  await ensureCourseExists(courseId);

  const enrollments = await CourseEnrollment.find({ courseId })
    .populate("userId", "name email role isActive isBlocked")
    .sort({ enrolledAt: -1, createdAt: -1 });

  return enrollments.map((enrollment) => ({
    ...sanitizeEnrollment(enrollment),
    user: enrollment.userId
      ? {
          id: enrollment.userId._id,
          name: enrollment.userId.name || null,
          email: enrollment.userId.email || null,
          role: enrollment.userId.role,
          isActive: enrollment.userId.isActive,
          isBlocked: enrollment.userId.isBlocked,
        }
      : null,
  }));
};

export const updateCourse = async (courseId, payload, adminUserId) => {
  const course = await ensureCourseExists(courseId);

  Object.assign(course, normalizeCoursePayload(payload), {
    updatedBy: adminUserId || course.updatedBy,
  });
  await course.save();

  return sanitizeAdminCourse(course);
};

export const updateCourseWithFiles = async ({ courseId, payload, files, adminUserId }) => {
  const course = await ensureCourseExists(courseId);

  const bannerFile = files?.bannerImage?.[0] || files?.bannerImageUrl?.[0] || null;
  if (bannerFile) {
    const oldPublicId = course.bannerImagePublicId || null;
    if (oldPublicId) await deleteImage(oldPublicId);
  }

  return updateCourse(courseId, payload, adminUserId);
};

export const deleteCourse = async (courseId, adminUserId) => {
  const course = await ensureCourseExists(courseId);

  course.isDeleted = true;
  course.deletedAt = new Date();
  course.isPublished = false;
  course.status = "archived";
  course.updatedBy = adminUserId || course.updatedBy;
  await course.save();

  return sanitizeAdminCourse(course);
};

export const publishCourse = async (courseId, isPublished, adminUserId) => {
  const course = await ensureCourseExists(courseId);

  course.isPublished = isPublished;
  course.status = isPublished ? "published" : "draft";
  course.updatedBy = adminUserId || course.updatedBy;
  await course.save();

  return sanitizeAdminCourse(course);
};

export const featureCourse = async (courseId, isFeatured, adminUserId) => {
  const course = await ensureCourseExists(courseId);

  course.isFeatured = isFeatured;
  course.updatedBy = adminUserId || course.updatedBy;
  await course.save();

  return sanitizeAdminCourse(course);
};

export const createLesson = async (courseId, payload) => {
  await ensureCourseExists(courseId);

  const normalized = normalizeLessonPayload(payload);
  normalized.sortOrder = await resolveLessonSortOrder(courseId, normalized.sortOrder);

  const lesson = await Lesson.create({
    ...normalized,
    courseId,
  });
  await recalculateLessonCount(courseId);

  return sanitizeLesson(lesson);
};

export const getAdminLessons = async (courseId) => {
  await ensureCourseExists(courseId);
  const lessons = await Lesson.find({ courseId }).sort({ sortOrder: 1 });

  return lessons.map((lesson) => sanitizeLesson(lesson));
};

export const getAdminLessonById = async (lessonId) => {
  const lesson = await ensureLessonExists(lessonId);
  return sanitizeLesson(lesson);
};

export const updateLesson = async (lessonId, payload) => {
  const lesson = await ensureLessonExists(lessonId);
  Object.assign(lesson, normalizeLessonPayload(payload));
  await lesson.save();
  await recalculateLessonCount(lesson.courseId);

  return sanitizeLesson(lesson);
};

export const updateLessonWithFiles = async (lessonId, payload, files) => {
  const lesson = await ensureLessonExists(lessonId);

  const videoFile =
    files?.lessonVideo?.[0] || files?.videoFile?.[0] || files?.videoUrl?.[0] || null;
  if (videoFile && lesson.videoPublicId) {
    await deleteCloudinaryAsset(lesson.videoPublicId, lesson.videoAssetResourceType || "video");
  }

  if (payload.resources && Array.isArray(payload.resources)) {
    const oldResources = lesson.resources || [];
    for (let i = 0; i < payload.resources.length; i += 1) {
      const resourceFile =
        files?.[`resourceFile_${i}`]?.[0] ||
        files?.[`resourceUrl_${i}`]?.[0] ||
        files?.[`resources[${i}][url]`]?.[0] ||
        (i === 0 ? files?.["resources[url]"]?.[0] : null) ||
        null;
      if (!resourceFile || !oldResources[i]?.assetPublicId) continue;
      await deleteCloudinaryAsset(
        oldResources[i].assetPublicId,
        oldResources[i].assetResourceType || "raw"
      );
    }
  }

  return updateLesson(lessonId, payload);
};

export const deleteLesson = async (lessonId) => {
  const lesson = await ensureLessonExists(lessonId);
  await lesson.deleteOne();
  await LessonProgress.deleteMany({ lessonId });
  await recalculateLessonCount(lesson.courseId);

  return sanitizeLesson(lesson);
};

export const publishLesson = async (lessonId, isPublished) => {
  const lesson = await ensureLessonExists(lessonId);
  lesson.isPublished = isPublished;
  await lesson.save();

  return sanitizeLesson(lesson);
};

export const reorderLessons = async (lessons) => {
  const ids = lessons.map((lesson) => lesson.id);
  const existingLessons = await Lesson.find({ _id: { $in: ids } });

  if (existingLessons.length !== ids.length) {
    throw new ApiError(httpStatus.NOT_FOUND, "One or more lessons were not found.");
  }

  for (const [index, lesson] of lessons.entries()) {
    await Lesson.findByIdAndUpdate(lesson.id, { sortOrder: -index - 1 });
  }
  for (const lesson of lessons) {
    await Lesson.findByIdAndUpdate(lesson.id, { sortOrder: lesson.sortOrder });
  }

  const reorderedLessons = await Lesson.find({ _id: { $in: ids } }).sort({ sortOrder: 1 });

  return reorderedLessons.map((lesson) => sanitizeLesson(lesson));
};

export const getPublishedCourses = async (query) => {
  const filter = buildCourseFilter(query, { publicOnly: true });
  const total = await Course.countDocuments(filter);
  const courses = await Course.find(filter)
    .sort(buildSort(query))
    .skip((query.page - 1) * query.limit)
    .limit(query.limit);

  return {
    items: courses.map(sanitizeCourse),
    meta: buildMeta({ page: query.page, limit: query.limit, total }),
  };
};

export const getFeaturedCourses = async (query) => {
  return getPublishedCourses({ ...query, featured: true });
};

export const getPublishedCourseById = async (courseId, userId = null) => {
  const course = await ensureCourseExists(courseId, { publicOnly: true });
  const lessons = await Lesson.find({ courseId, isPublished: true }).sort({ sortOrder: 1 });
  const enrollment = userId ? await getEnrollment(courseId, userId) : null;

  return {
    ...sanitizeCourse(course),
    enrollment: enrollment ? sanitizeEnrollment(enrollment) : null,
    lessons: lessons.map((lesson) =>
      sanitizeLesson(lesson, {
        includeContent: lesson.isPreview || COURSE_ACCESS_PAYMENT_STATUSES.includes(enrollment?.paymentStatus),
      })
    ),
  };
};

export const enrollCourse = async (courseId, userId) => {
  const course = await ensureCourseExists(courseId, { publicOnly: true });
  const existing = await getEnrollment(courseId, userId);

  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, "User is already enrolled in this course.");
  }

  let paymentStatus = "free";
  if (course.accessType === "paid") paymentStatus = "pending";
  if (course.accessType === "subscription") {
    const user = await User.findById(userId);
    if (!user?.subscription?.isActive) {
      throw new ApiError(httpStatus.FORBIDDEN, "Active subscription is required.");
    }
    paymentStatus = "paid";
  }

  const enrollment = await CourseEnrollment.create({
    courseId,
    userId,
    accessType: course.accessType,
    paymentStatus,
  });

  await Course.findByIdAndUpdate(courseId, { $inc: { studentCount: 1 } });

  return {
    course: sanitizeCourse(course),
    enrollment: sanitizeEnrollment(enrollment),
    paymentRequired: course.accessType === "paid",
  };
};

export const checkoutCourse = async (courseId, userId) => {
  const course = await ensureCourseExists(courseId, { publicOnly: true });

  if (course.accessType !== "paid") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Checkout is only required for paid courses.");
  }

  if (course.price <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Paid courses must have a price greater than 0.");
  }

  const user = await User.findById(userId);
  if (!user || !user.isActive || user.isBlocked) {
    throw new ApiError(httpStatus.FORBIDDEN, "Only active users can checkout.");
  }

  let enrollment = await getEnrollment(courseId, userId);
  if (enrollment?.paymentStatus === "paid") {
    throw new ApiError(httpStatus.CONFLICT, "User is already enrolled in this course.");
  }

  if (!enrollment) {
    enrollment = await CourseEnrollment.create({
      courseId,
      userId,
      accessType: "paid",
      paymentStatus: "pending",
    });
    await Course.findByIdAndUpdate(courseId, { $inc: { studentCount: 1 } });
  }

  let order = enrollment.orderId ? await Order.findById(enrollment.orderId) : null;
  if (!order || order.status !== "pending") {
    order = await createCourseOrder({ user, course, enrollment });
    enrollment.orderId = order._id;
    await enrollment.save();
  }

  const stripe = getStripeClient();
  const customerId = await createOrReuseStripeCustomer(user);
  const baseUrl = getCheckoutBaseUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    client_reference_id: user._id.toString(),
    line_items: [buildCourseLineItem(course)],
    success_url: `${baseUrl}/courses/${course._id}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/courses/${course._id}/cancel?session_id={CHECKOUT_SESSION_ID}`,
    metadata: {
      itemType: "course",
      orderId: order._id.toString(),
      enrollmentId: enrollment._id.toString(),
      courseId: course._id.toString(),
      userId: user._id.toString(),
    },
  });

  order.checkoutSessionId = session.id;
  order.stripeCustomerId = customerId;
  await order.save();

  return {
    requiresPayment: true,
    checkoutUrl: session.url,
    sessionId: session.id,
    course: sanitizeCourse(course),
    enrollment: sanitizeEnrollment(enrollment),
    order: sanitizeOrder(order),
  };
};

export const getMyCourses = async (userId, query) => {
  const enrollments = await CourseEnrollment.find({ userId })
    .populate({
      path: "courseId",
      match: buildCourseFilter(query),
    })
    .sort({ createdAt: -1 });

  const filtered = enrollments
    .filter((enrollment) => enrollment.courseId)
    .map((enrollment) => ({
      course: sanitizeCourse(enrollment.courseId),
      enrollment: sanitizeEnrollment(enrollment),
    }));
  const total = filtered.length;
  const start = (query.page - 1) * query.limit;

  return {
    items: filtered.slice(start, start + query.limit),
    meta: buildMeta({ page: query.page, limit: query.limit, total }),
  };
};

export const getAccessibleCourseLessons = async (courseId, userId) => {
  await ensureCourseExists(courseId, { publicOnly: true });
  await ensureEnrollmentCanAccessContent(courseId, userId);

  const lessons = await Lesson.find({ courseId, isPublished: true }).sort({ sortOrder: 1 });
  return lessons.map((lesson) => sanitizeLesson(lesson));
};

export const getAccessibleLessonById = async (lessonId, userId) => {
  const lesson = await ensureLessonExists(lessonId);
  const course = await ensureCourseExists(lesson.courseId, { publicOnly: true });

  if (!lesson.isPublished) {
    throw new ApiError(httpStatus.NOT_FOUND, "Lesson not found.");
  }

  const enrollment = await getEnrollment(lesson.courseId, userId);
  const hasAccess =
    lesson.isPreview || COURSE_ACCESS_PAYMENT_STATUSES.includes(enrollment?.paymentStatus);

  if (!hasAccess) {
    throw new ApiError(httpStatus.FORBIDDEN, "You do not have access to this lesson.");
  }

  const nextLesson = await Lesson.findOne({
    courseId: lesson.courseId,
    isPublished: true,
    sortOrder: { $gt: lesson.sortOrder },
  }).sort({ sortOrder: 1 });

  return {
    course: sanitizeCourse(course),
    lesson: sanitizeLesson(lesson),
    nextLesson: nextLesson ? sanitizeLesson(nextLesson, { includeContent: false }) : null,
  };
};

export const updateLessonProgress = async (lessonId, userId, watchedSeconds) => {
  const lesson = await ensureLessonExists(lessonId);
  await ensureCourseExists(lesson.courseId, { publicOnly: true });
  await ensureEnrollmentCanAccessContent(lesson.courseId, userId);

  if (!lesson.isPublished) {
    throw new ApiError(httpStatus.NOT_FOUND, "Lesson not found.");
  }

  const progress = await LessonProgress.findOneAndUpdate(
    { lessonId, userId },
    {
      courseId: lesson.courseId,
      watchedSeconds,
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return sanitizeProgress(progress);
};

export const completeLesson = async (lessonId, userId) => {
  const lesson = await ensureLessonExists(lessonId);
  await ensureCourseExists(lesson.courseId, { publicOnly: true });
  await ensureEnrollmentCanAccessContent(lesson.courseId, userId);

  if (!lesson.isPublished) {
    throw new ApiError(httpStatus.NOT_FOUND, "Lesson not found.");
  }

  const progress = await LessonProgress.findOneAndUpdate(
    { lessonId, userId },
    {
      courseId: lesson.courseId,
      watchedSeconds: Math.max(lesson.videoDurationSeconds || 0, 0),
      isCompleted: true,
      completedAt: new Date(),
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
  const enrollment = await recalculateCourseProgress(lesson.courseId, userId);

  return {
    progress: sanitizeProgress(progress),
    enrollment: sanitizeEnrollment(enrollment),
  };
};

export const getCourseProgress = async (courseId, userId) => {
  await ensureCourseExists(courseId, { publicOnly: true });
  const enrollment = await ensureEnrollmentCanAccessContent(courseId, userId);
  const progresses = await LessonProgress.find({ courseId, userId });

  return {
    enrollment: sanitizeEnrollment(enrollment),
    lessons: progresses.map(sanitizeProgress),
  };
};

export const completeCourseEnrollmentPayment = async (
  courseId,
  enrollmentId,
  { paymentReference = "", paymentProvider = "manual" } = {}
) => {
  const course = await ensureCourseExists(courseId);
  const enrollment = await CourseEnrollment.findOne({ _id: enrollmentId, courseId });

  if (!enrollment) {
    throw new ApiError(httpStatus.NOT_FOUND, "Course enrollment not found.");
  }

  if (course.accessType !== "paid") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Payment completion is only applicable to paid courses."
    );
  }

  enrollment.paymentStatus = "paid";
  await enrollment.save();

  let order = enrollment.orderId ? await Order.findById(enrollment.orderId) : null;
  if (order) {
    order.status = "paid";
    order.paymentProvider = paymentProvider || order.paymentProvider;
    order.paymentIntentId = paymentReference || order.paymentIntentId;
    order.paidAt = order.paidAt || new Date();
    await order.save();
  }

  return {
    course: sanitizeAdminCourse(course),
    enrollment: sanitizeEnrollment(enrollment),
    order: order ? sanitizeOrder(order) : null,
  };
};

export const completeCourseOrderFromCheckoutSession = async (session, eventId = null) => {
  const orderId = session.metadata?.orderId;
  const enrollmentId = session.metadata?.enrollmentId;

  if (!orderId || !enrollmentId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Stripe course metadata is incomplete.");
  }

  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "Course order not found.");

  const enrollment = await CourseEnrollment.findById(enrollmentId);
  if (!enrollment) {
    throw new ApiError(httpStatus.NOT_FOUND, "Course enrollment not found.");
  }

  order.status = "paid";
  order.checkoutSessionId = session.id;
  order.paymentIntentId = session.payment_intent || null;
  order.stripeCustomerId = session.customer || null;
  order.stripeEventId = eventId;
  order.paidAt = order.paidAt || new Date();
  await order.save();

  enrollment.paymentStatus = "paid";
  enrollment.orderId = order._id;
  await enrollment.save();

  return {
    order: sanitizeOrder(order),
    enrollment: sanitizeEnrollment(enrollment),
  };
};

export const markCourseCheckoutExpired = async (session, eventId = null) => {
  const order = await Order.findOne({ checkoutSessionId: session.id, itemType: "course" });
  if (!order || order.status !== "pending") return null;

  order.status = "canceled";
  order.canceledAt = new Date();
  order.stripeEventId = eventId;
  await order.save();

  const enrollment = await CourseEnrollment.findById(order.metadata?.enrollmentId);
  if (enrollment && enrollment.paymentStatus === "pending") {
    enrollment.paymentStatus = "failed";
    await enrollment.save();
  }

  return sanitizeOrder(order);
};

export const handleCourseStripeWebhook = async (event) => {
  switch (event.type) {
    case "checkout.session.completed":
      return completeCourseOrderFromCheckoutSession(event.data.object, event.id);
    case "checkout.session.expired":
      return markCourseCheckoutExpired(event.data.object, event.id);
    default:
      return { received: true };
  }
};
