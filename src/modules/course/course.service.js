import httpStatus from "../../constants/httpStatus.js";
import getStripeClient from "../../config/stripe.js";
import ApiError from "../../utils/api-error.js";
import { deleteCloudinaryAsset, deleteImage, deleteStoredAsset } from "../../services/upload.service.js";
import Order from "../order/order.model.js";
import { User } from "../user/user.model.js";
import { Course } from "./course.model.js";
import * as entitlementService from "../entitlement/entitlement.service.js";
import { CourseEnrollment } from "./course-enrollment.model.js";
import { Chapter } from "./chapter.model.js";
import { LESSON_CONTENT_TYPES, QUIZ_QUESTION_TYPES, Lesson } from "./lesson.model.js";
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

const isObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || ""));

const questionTypeOf = (question) =>
  QUIZ_QUESTION_TYPES.includes(question?.type) ? question.type : "single";

const isUngradedQuestion = (type) => type === "rating" || type === "scale" || type === "text";

const normalizeQuestions = (questions) => {
  if (!Array.isArray(questions)) return [];
  return questions.map((question) => {
    const type = questionTypeOf(question);
    const normalized = {
      type,
      optional: Boolean(question?.optional),
      prompt: normalizeString(question?.prompt),
      choices: isUngradedQuestion(type)
        ? []
        : (Array.isArray(question?.choices) ? question.choices : []).map((choice) => {
            const item = {
              text: normalizeString(choice?.text),
              isCorrect: Boolean(choice?.isCorrect),
            };
            const choiceId = choice?.id || choice?._id;
            if (isObjectId(choiceId)) item._id = choiceId;
            return item;
          }),
    };
    const questionId = question?.id || question?._id;
    if (isObjectId(questionId)) normalized._id = questionId;
    return normalized;
  });
};

const normalizeLessonPayload = (payload) => {
  const normalized = { ...payload };

  for (const field of [
    "title",
    "summary",
    "body",
    "contentType",
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
  if (normalized.questions !== undefined) {
    normalized.questions = normalizeQuestions(normalized.questions);
  }
  if (normalized.requirePassingGrade !== undefined) {
    normalized.requirePassingGrade = normalized.requirePassingGrade === true;
  }
  if (normalized.passingGrade !== undefined && normalized.passingGrade !== null && normalized.passingGrade !== "") {
    const grade = Number(normalized.passingGrade);
    if (Number.isInteger(grade)) normalized.passingGrade = Math.min(100, Math.max(0, grade));
  }

  return normalized;
};

/** Ensures new lesson does not violate unique index { chapterId, sortOrder }. */
const resolveLessonSortOrder = async (chapterId, requestedSortOrder) => {
  const hasRequested =
    typeof requestedSortOrder === "number" &&
    Number.isInteger(requestedSortOrder) &&
    requestedSortOrder >= 0;

  if (hasRequested) {
    const clash = await Lesson.findOne({ chapterId, sortOrder: requestedSortOrder }).select("_id").lean();
    if (!clash) return requestedSortOrder;
  }

  const last = await Lesson.findOne({ chapterId }).sort({ sortOrder: -1 }).select("sortOrder").lean();
  return (last?.sortOrder ?? -1) + 1;
};

const resolveChapterSortOrder = async (courseId, requestedSortOrder) => {
  const hasRequested =
    typeof requestedSortOrder === "number" &&
    Number.isInteger(requestedSortOrder) &&
    requestedSortOrder >= 0;

  if (hasRequested) {
    const clash = await Chapter.findOne({ courseId, sortOrder: requestedSortOrder }).select("_id").lean();
    if (!clash) return requestedSortOrder;
  }

  const last = await Chapter.findOne({ courseId }).sort({ sortOrder: -1 }).select("sortOrder").lean();
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
  const [lessonsCount, publishedChapterIds] = await Promise.all([
    Lesson.countDocuments({ courseId, isPublished: true }),
    Lesson.distinct("chapterId", { courseId, isPublished: true }),
  ]);
  await Course.findByIdAndUpdate(courseId, {
    lessonsCount,
    chaptersCount: publishedChapterIds.filter(Boolean).length,
  });
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
  chaptersCount: course.chaptersCount ?? 0,
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

const sanitizeLesson = (
  lesson,
  {
    includeContent = true,
    includeAnswers = false,
    isCompleted = false,
    locked = false,
    lockReason = null,
  } = {}
) => ({
  id: lesson._id,
  courseId: lesson.courseId,
  chapterId: lesson.chapterId,
  contentType: lesson.contentType || "video",
  title: lesson.title,
  summary: includeContent ? lesson.summary : "",
  body: includeContent ? lesson.body || "" : "",
  videoUrl: includeContent ? lesson.videoUrl : "",
  videoDurationText: lesson.videoDurationText,
  videoDurationSeconds: lesson.videoDurationSeconds,
  resources: includeContent
    ? (lesson.resources || []).map((resource) => ({
        title: resource.title,
        type: resource.type,
        url: resource.url,
      }))
    : [],
  questions:
    includeContent && (lesson.contentType === "quiz" || lesson.contentType === "survey")
      ? (lesson.questions || []).map((question) => ({
          id: question._id,
          type: question.type || "single",
          optional: Boolean(question.optional),
          prompt: question.prompt,
          choices: (question.choices || []).map((choice) => ({
            id: choice._id,
            text: choice.text,
            ...(includeAnswers ? { isCorrect: Boolean(choice.isCorrect) } : {}),
          })),
        }))
      : [],
  questionCount:
    lesson.contentType === "quiz" || lesson.contentType === "survey"
      ? (lesson.questions || []).length
      : 0,
  sortOrder: lesson.sortOrder,
  isPreview: lesson.isPreview,
  isPrerequisite: Boolean(lesson.isPrerequisite),
  requirePassingGrade: lesson.requirePassingGrade !== false,
  passingGrade: Number.isInteger(lesson.passingGrade) ? lesson.passingGrade : 100,
  isPublished: lesson.isPublished,
  isCompleted: Boolean(isCompleted),
  locked: Boolean(locked),
  lockReason,
  createdAt: lesson.createdAt,
  updatedAt: lesson.updatedAt,
});

const sanitizeChapter = (chapter, lessons = null) => ({
  id: chapter._id,
  courseId: chapter.courseId,
  title: chapter.title,
  sortOrder: chapter.sortOrder,
  ...(lessons ? { lessons } : {}),
});

const assertLessonContent = (lesson) => {
  const contentType = lesson.contentType || "video";
  if (!LESSON_CONTENT_TYPES.includes(contentType)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "contentType must be video, text, quiz, or survey.");
  }
  if (contentType === "video" && !normalizeString(lesson.videoUrl)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Video lessons require a video.");
  }
  if (contentType === "text" && !normalizeString(lesson.body)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Text lessons require lesson text.");
  }
  if (contentType === "quiz" || contentType === "survey") {
    const questions = lesson.questions || [];
    if (questions.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Add at least one question.");
    }
    for (const question of questions) {
      const type = questionTypeOf(question);
      if (!normalizeString(question.prompt)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Each question needs a prompt.");
      }
      if (isUngradedQuestion(type)) continue;
      const choices = question.choices || [];
      if (choices.length < 2 || choices.length > 8) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Each choice question needs 2 to 8 choices.");
      }
      if (contentType === "survey") continue;
      const correctCount = choices.filter((choice) => choice.isCorrect).length;
      if (type === "multiple" ? correctCount < 1 : correctCount !== 1) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          type === "multiple"
            ? "Each multiple-answer question needs at least one correct choice."
            : "Each one-answer question must have exactly one correct choice."
        );
      }
    }
  }
};

const saveDocument = async (document, conflictMessage) => {
  try {
    await document.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(httpStatus.CONFLICT, conflictMessage);
    }
    throw error;
  }
};

const ensureChapterInCourse = async (courseId, chapterId) => {
  if (!chapterId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "chapterId is required.");
  }
  const chapter = await Chapter.findOne({ _id: chapterId, courseId });
  if (!chapter) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Chapter not found for this course.");
  }
  return chapter;
};

const orderLessons = (chapters, lessons) => {
  const chapterOrder = new Map(chapters.map((chapter) => [String(chapter._id), chapter.sortOrder]));
  return [...lessons].sort((a, b) => {
    const aChapter = chapterOrder.has(String(a.chapterId))
      ? chapterOrder.get(String(a.chapterId))
      : Number.MAX_SAFE_INTEGER;
    const bChapter = chapterOrder.has(String(b.chapterId))
      ? chapterOrder.get(String(b.chapterId))
      : Number.MAX_SAFE_INTEGER;
    if (aChapter !== bChapter) return aChapter - bChapter;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return String(a._id).localeCompare(String(b._id));
  });
};

const isBlockedByPrerequisite = (orderedLessons, lessonId, completedIds) => {
  const index = orderedLessons.findIndex((lesson) => String(lesson._id) === String(lessonId));
  if (index < 0) return false;
  for (let cursor = 0; cursor < index; cursor += 1) {
    const prior = orderedLessons[cursor];
    if (prior.isPrerequisite && !completedIds.has(String(prior._id))) return true;
  }
  return false;
};

const learnerHasCourseAccess = (enrollment) =>
  COURSE_ACCESS_PAYMENT_STATUSES.includes(enrollment?.paymentStatus);

const presentLearnerLesson = (lesson, { hasCourseAccess, blocked, isCompleted }) => {
  const includeContent = (Boolean(lesson.isPreview) || hasCourseAccess) && !blocked;
  let lockReason = null;
  if (!includeContent) {
    lockReason = !lesson.isPreview && !hasCourseAccess ? "enrollment" : "prerequisite";
  }
  return sanitizeLesson(lesson, {
    includeContent,
    includeAnswers: false,
    isCompleted,
    locked: !includeContent,
    lockReason,
  });
};

const loadLearnerContext = async (courseId, userId) => {
  await ensureOrphanLessonsHaveChapters(courseId);
  const chapters = await Chapter.find({ courseId }).sort({ sortOrder: 1 });
  const lessons = await Lesson.find({ courseId, isPublished: true });
  const ordered = orderLessons(chapters, lessons);
  const enrollment = userId ? await getEnrollment(courseId, userId) : null;
  const hasCourseAccess = learnerHasCourseAccess(enrollment);
  if (userId) await finalizeSubmittedAttempts(courseId, userId);
  const progresses = userId
    ? await LessonProgress.find({ courseId, userId, isCompleted: true }).select("lessonId").lean()
    : [];
  const completedIds = new Set(progresses.map((progress) => String(progress.lessonId)));
  return { chapters, ordered, enrollment, hasCourseAccess, completedIds };
};

const describeLearnerLesson = (lesson, context) => {
  const blocked =
    context.hasCourseAccess &&
    isBlockedByPrerequisite(context.ordered, lesson._id, context.completedIds);
  return presentLearnerLesson(lesson, {
    hasCourseAccess: context.hasCourseAccess,
    blocked,
    isCompleted: context.completedIds.has(String(lesson._id)),
  });
};

const recalculateCourseProgressForAll = async (courseId) => {
  const enrollments = await CourseEnrollment.find({ courseId }).select("userId");
  for (const enrollment of enrollments) {
    await recalculateCourseProgress(courseId, enrollment.userId);
  }
};

const orphanLessonFilter = (courseId) => ({
  ...(courseId ? { courseId } : {}),
  $or: [{ chapterId: null }, { chapterId: { $exists: false } }],
});

const ensureOrphanLessonsHaveChapters = async (courseId) => {
  const filter = orphanLessonFilter(courseId);
  const orphans = await Lesson.find(filter).select("courseId");
  if (orphans.length === 0) return;

  const courseIds = [...new Set(orphans.map((lesson) => String(lesson.courseId)))];
  for (const id of courseIds) {
    const stillOrphan = await Lesson.exists(orphanLessonFilter(id));
    if (!stillOrphan) continue;
    const sortOrder = await resolveChapterSortOrder(id);
    const chapter = await Chapter.create({
      courseId: id,
      title: "Course content",
      sortOrder,
    });
    await Lesson.updateMany(orphanLessonFilter(id), {
      $set: { chapterId: chapter._id, contentType: "video" },
    });
  }
};

const rewriteSortOrders = async (Model, documents) => {
  for (let index = 0; index < documents.length; index += 1) {
    await Model.updateOne({ _id: documents[index]._id }, { $set: { sortOrder: -1000000 - index } });
  }
  for (let index = 0; index < documents.length; index += 1) {
    await Model.updateOne({ _id: documents[index]._id }, { $set: { sortOrder: index } });
  }
};

const fixDuplicateSortOrders = async (Model, groupField) => {
  const documents = await Model.find().sort({ [groupField]: 1, sortOrder: 1, _id: 1 });
  const groups = new Map();
  for (const document of documents) {
    const key = String(document[groupField] || "");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(document);
  }
  for (const group of groups.values()) {
    const orders = new Set(group.map((document) => document.sortOrder));
    if (orders.size === group.length) continue;
    await rewriteSortOrders(Model, group);
  }
};

const dropLegacyLessonSortIndex = async () => {
  const indexes = await Lesson.collection.indexes();
  const legacy = indexes.find((index) => {
    if (!index.unique || !index.key) return false;
    const keys = Object.keys(index.key);
    return keys.length === 2 && index.key.courseId === 1 && index.key.sortOrder === 1;
  });
  if (!legacy) return;
  await Lesson.collection.dropIndex(legacy.name);
};

export const migrateCurriculum = async () => {
  await ensureOrphanLessonsHaveChapters();
  await Lesson.updateMany({ contentType: { $exists: false } }, { $set: { contentType: "video" } });
  await dropLegacyLessonSortIndex();
  await fixDuplicateSortOrders(Chapter, "courseId");
  await fixDuplicateSortOrders(Lesson, "chapterId");
  await Chapter.syncIndexes();
  await Lesson.syncIndexes();

  const courses = await Course.find({ isDeleted: false }).select("_id");
  for (const course of courses) {
    await recalculateLessonCount(course._id);
  }
};

const sanitizeEnrollment = (enrollment) => ({
  id: enrollment._id,
  courseId: enrollment.courseId,
  userId: enrollment.userId,
  accessType: enrollment.accessType,
  paymentStatus: enrollment.paymentStatus,
  orderId: enrollment.orderId,
  benefitSource: enrollment.benefitSource ?? "free",
  benefitPeriodId: enrollment.benefitPeriodId ?? null,
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
  const chapter = await ensureChapterInCourse(courseId, payload.chapterId);
  const normalized = normalizeLessonPayload(payload);
  normalized.chapterId = chapter._id;
  normalized.contentType = normalized.contentType || "video";
  if (normalized.contentType !== "quiz" && normalized.contentType !== "survey") normalized.questions = [];
  normalized.sortOrder = await resolveLessonSortOrder(chapter._id, normalized.sortOrder);

  const lesson = new Lesson({
    ...normalized,
    courseId,
  });
  assertLessonContent(lesson);
  await saveDocument(lesson, "Another lesson in this chapter already uses that order.");
  await recalculateLessonCount(courseId);

  return sanitizeLesson(lesson, { includeAnswers: true });
};

export const getAdminLessons = async (courseId) => {
  await ensureCourseExists(courseId);
  await ensureOrphanLessonsHaveChapters(courseId);
  const chapters = await Chapter.find({ courseId }).sort({ sortOrder: 1 });
  const lessons = await Lesson.find({ courseId });

  return orderLessons(chapters, lessons).map((lesson) => sanitizeLesson(lesson, { includeAnswers: true }));
};

export const getAdminLessonById = async (lessonId) => {
  const lesson = await ensureLessonExists(lessonId);
  return sanitizeLesson(lesson, { includeAnswers: true });
};

export const updateLesson = async (lessonId, payload) => {
  const lesson = await ensureLessonExists(lessonId);
  if (payload.chapterId !== undefined) {
    await ensureChapterInCourse(lesson.courseId, payload.chapterId);
  }
  Object.assign(lesson, normalizeLessonPayload(payload));
  if (lesson.contentType !== "quiz" && lesson.contentType !== "survey") lesson.questions = [];
  assertLessonContent(lesson);
  await saveDocument(lesson, "Another lesson in this chapter already uses that order.");
  await recalculateLessonCount(lesson.courseId);
  if (lesson.contentType === "quiz") await rescoreQuizAttempts(lesson);

  return sanitizeLesson(lesson, { includeAnswers: true });
};

export const updateLessonWithFiles = async (lessonId, payload, files) => {
  const lesson = await ensureLessonExists(lessonId);

  const videoFile =
    files?.lessonVideo?.[0] || files?.videoFile?.[0] || files?.videoUrl?.[0] || null;
  if (videoFile && lesson.videoPublicId) {
    await deleteStoredAsset(lesson.videoPublicId, lesson.videoAssetResourceType || "video");
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
  const snapshot = sanitizeLesson(lesson, { includeAnswers: true });
  await deleteStoredAsset(lesson.videoPublicId, lesson.videoAssetResourceType || "video");
  await lesson.deleteOne();
  await LessonProgress.deleteMany({ lessonId });
  await recalculateLessonCount(lesson.courseId);
  await recalculateCourseProgressForAll(lesson.courseId);

  return snapshot;
};

export const publishLesson = async (lessonId, isPublished) => {
  const lesson = await ensureLessonExists(lessonId);
  lesson.isPublished = isPublished;
  await lesson.save();
  await recalculateLessonCount(lesson.courseId);

  return sanitizeLesson(lesson, { includeAnswers: true });
};

export const reorderLessons = async (lessons) => {
  const ids = lessons.map((lesson) => lesson.id);
  const existingLessons = await Lesson.find({ _id: { $in: ids } });

  if (existingLessons.length !== ids.length) {
    throw new ApiError(httpStatus.NOT_FOUND, "One or more lessons were not found.");
  }

  const byId = new Map(existingLessons.map((lesson) => [String(lesson._id), lesson]));
  const courseIds = [...new Set(existingLessons.map((lesson) => String(lesson.courseId)))];
  if (courseIds.length !== 1) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Lessons must belong to the same course.");
  }

  const finals = lessons.map((lesson) => {
    const current = byId.get(String(lesson.id));
    const chapterId = lesson.chapterId || current.chapterId;
    return { id: String(lesson.id), chapterId: String(chapterId), sortOrder: lesson.sortOrder };
  });

  const chapters = await Chapter.find({
    _id: { $in: finals.map((lesson) => lesson.chapterId) },
    courseId: courseIds[0],
  }).select("_id");
  if (chapters.length !== new Set(finals.map((lesson) => lesson.chapterId)).size) {
    throw new ApiError(httpStatus.BAD_REQUEST, "A lesson can only move into a chapter of the same course.");
  }

  const allLessons = await Lesson.find({ courseId: courseIds[0] }).select("chapterId sortOrder");
  const finalById = new Map(finals.map((lesson) => [lesson.id, lesson]));
  const occupied = new Set();
  for (const lesson of allLessons) {
    const next = finalById.get(String(lesson._id));
    const chapterId = next ? next.chapterId : String(lesson.chapterId);
    const sortOrder = next ? next.sortOrder : lesson.sortOrder;
    const key = `${chapterId}:${sortOrder}`;
    if (occupied.has(key)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Two lessons in a chapter cannot share the same order.");
    }
    occupied.add(key);
  }

  for (const [index, lesson] of finals.entries()) {
    await Lesson.findByIdAndUpdate(lesson.id, { sortOrder: -1000000 - index });
  }
  for (const lesson of finals) {
    await Lesson.findByIdAndUpdate(lesson.id, {
      chapterId: lesson.chapterId,
      sortOrder: lesson.sortOrder,
    });
  }

  const courseChapters = await Chapter.find({ courseId: courseIds[0] }).sort({ sortOrder: 1 });
  const reorderedLessons = await Lesson.find({ courseId: courseIds[0] });
  return orderLessons(courseChapters, reorderedLessons).map((lesson) =>
    sanitizeLesson(lesson, { includeAnswers: true })
  );
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
  const context = await loadLearnerContext(courseId, userId);

  return {
    ...sanitizeCourse(course),
    enrollment: context.enrollment ? sanitizeEnrollment(context.enrollment) : null,
    lessons: context.ordered.map((lesson) => describeLearnerLesson(lesson, context)),
  };
};

export const enrollCourseWithPlan = async (courseId, userId) => {
  const course = await ensureCourseExists(courseId, { publicOnly: true });
  const user = await User.findById(userId);

  if (!user || !user.isActive || user.isBlocked) {
    throw new ApiError(httpStatus.FORBIDDEN, "Only active users can enroll.");
  }

  const existing = await getEnrollment(courseId, userId);
  if (existing?.paymentStatus === "paid") {
    throw new ApiError(httpStatus.CONFLICT, "User is already enrolled in this course.");
  }

  if (course.accessType !== "paid") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Plan benefits apply to paid courses. Use standard enrollment for free courses."
    );
  }

  const benefit = await entitlementService.consumeCourseBenefit(user, courseId);

  if (existing) {
    existing.paymentStatus = "paid";
    existing.accessType = "paid";
    existing.benefitSource = "subscription";
    existing.benefitPeriodId = benefit.period._id;
    await existing.save();
    return {
      course: sanitizeCourse(course),
      enrollment: sanitizeEnrollment(existing),
      paymentRequired: false,
      benefitSource: "subscription",
    };
  }

  const enrollment = await CourseEnrollment.create({
    courseId,
    userId,
    accessType: "paid",
    paymentStatus: "paid",
    benefitSource: "subscription",
    benefitPeriodId: benefit.period._id,
  });

  await Course.findByIdAndUpdate(courseId, { $inc: { studentCount: 1 } });

  return {
    course: sanitizeCourse(course),
    enrollment: sanitizeEnrollment(enrollment),
    paymentRequired: false,
    benefitSource: "subscription",
  };
};

export const getCoursePlanBenefitEligibility = async (courseId, userId) => {
  const user = await User.findById(userId);
  if (!user) {
    return { eligible: false, reason: "Sign in required." };
  }

  try {
    const check = await entitlementService.canConsumeCourse(user);
    return {
      eligible: check.allowed,
      reason: check.reason ?? null,
      remaining: check.remaining ?? 0,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return { eligible: false, reason: error.message };
    }
    throw error;
  }
};

export const enrollCourse = async (courseId, userId) => {
  const course = await ensureCourseExists(courseId, { publicOnly: true });
  const existing = await getEnrollment(courseId, userId);

  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, "User is already enrolled in this course.");
  }

  const paymentStatus = course.accessType === "paid" ? "pending" : "free";

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
  const context = await loadLearnerContext(courseId, userId);
  return context.ordered.map((lesson) => describeLearnerLesson(lesson, context));
};

export const getCourseCurriculum = async (courseId, userId) => {
  await ensureCourseExists(courseId, { publicOnly: true });
  const context = await loadLearnerContext(courseId, userId);
  const lessonsByChapter = new Map();
  for (const lesson of context.ordered) {
    const key = String(lesson.chapterId);
    if (!lessonsByChapter.has(key)) lessonsByChapter.set(key, []);
    lessonsByChapter.get(key).push(describeLearnerLesson(lesson, context));
  }

  return {
    chapters: context.chapters
      .filter((chapter) => (lessonsByChapter.get(String(chapter._id)) || []).length > 0)
      .map((chapter) => sanitizeChapter(chapter, lessonsByChapter.get(String(chapter._id)) || [])),
  };
};

const assertLearnerCanOpenLesson = async (lesson, userId) => {
  if (!lesson.isPublished) {
    throw new ApiError(httpStatus.NOT_FOUND, "Lesson not found.");
  }
  const course = await ensureCourseExists(lesson.courseId, { publicOnly: true });
  const context = await loadLearnerContext(lesson.courseId, userId);
  const blocked =
    context.hasCourseAccess &&
    isBlockedByPrerequisite(context.ordered, lesson._id, context.completedIds);

  if (!lesson.isPreview && !context.hasCourseAccess) {
    throw new ApiError(httpStatus.FORBIDDEN, "You do not have access to this lesson.");
  }
  if (blocked) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Complete the required lessons before opening this one."
    );
  }

  return { course, context };
};

const assertLearnerCanStudyLesson = async (lesson, userId) => {
  const opened = await assertLearnerCanOpenLesson(lesson, userId);
  if (!opened.context.hasCourseAccess) {
    throw new ApiError(httpStatus.FORBIDDEN, "You must enroll in this course first.");
  }
  return opened;
};

export const getAccessibleLessonById = async (lessonId, userId) => {
  const lesson = await ensureLessonExists(lessonId);
  const { course, context } = await assertLearnerCanOpenLesson(lesson, userId);
  const index = context.ordered.findIndex((item) => String(item._id) === String(lesson._id));
  const nextLesson = index >= 0 ? context.ordered[index + 1] : null;

  return {
    course: sanitizeCourse(course),
    lesson: describeLearnerLesson(lesson, context),
    nextLesson: nextLesson ? describeLearnerLesson(nextLesson, context) : null,
  };
};

export const updateLessonProgress = async (lessonId, userId, watchedSeconds) => {
  const lesson = await ensureLessonExists(lessonId);
  await assertLearnerCanStudyLesson(lesson, userId);

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
  await assertLearnerCanStudyLesson(lesson, userId);

  if (lesson.contentType === "quiz" || lesson.contentType === "survey") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      lesson.contentType === "survey"
        ? "Submit the survey to complete this lesson."
        : "Submit the quiz to complete this lesson."
    );
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

export const createChapter = async (courseId, payload) => {
  await ensureCourseExists(courseId);
  const sortOrder = await resolveChapterSortOrder(courseId, payload.sortOrder);
  const chapter = new Chapter({
    courseId,
    title: normalizeString(payload.title),
    sortOrder,
  });
  await saveDocument(chapter, "Another chapter in this course already uses that order.");
  return sanitizeChapter(chapter, []);
};

export const updateChapter = async (chapterId, payload) => {
  const chapter = await Chapter.findById(chapterId);
  if (!chapter) throw new ApiError(httpStatus.NOT_FOUND, "Chapter not found.");
  chapter.title = normalizeString(payload.title);
  await chapter.save();
  return sanitizeChapter(chapter);
};

export const deleteChapter = async (chapterId) => {
  const chapter = await Chapter.findById(chapterId);
  if (!chapter) throw new ApiError(httpStatus.NOT_FOUND, "Chapter not found.");

  const lessons = await Lesson.find({ chapterId }).select("_id videoPublicId videoAssetResourceType");
  const lessonIds = lessons.map((lesson) => lesson._id);
  if (lessonIds.length > 0) {
    for (const lesson of lessons) {
      await deleteStoredAsset(lesson.videoPublicId, lesson.videoAssetResourceType || "video");
    }
    await LessonProgress.deleteMany({ lessonId: { $in: lessonIds } });
    await Lesson.deleteMany({ chapterId });
  }

  const snapshot = sanitizeChapter(chapter);
  await chapter.deleteOne();
  await recalculateLessonCount(chapter.courseId);
  await recalculateCourseProgressForAll(chapter.courseId);
  return snapshot;
};

export const reorderChapters = async (chapters) => {
  const ids = chapters.map((chapter) => chapter.id);
  const existing = await Chapter.find({ _id: { $in: ids } });
  if (existing.length !== ids.length) {
    throw new ApiError(httpStatus.NOT_FOUND, "One or more chapters were not found.");
  }

  const courseIds = [...new Set(existing.map((chapter) => String(chapter.courseId)))];
  if (courseIds.length !== 1) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Chapters must belong to the same course.");
  }

  const allChapters = await Chapter.find({ courseId: courseIds[0] }).select("sortOrder");
  const finalById = new Map(chapters.map((chapter) => [String(chapter.id), chapter.sortOrder]));
  const occupied = new Set();
  for (const chapter of allChapters) {
    const sortOrder = finalById.has(String(chapter._id))
      ? finalById.get(String(chapter._id))
      : chapter.sortOrder;
    if (occupied.has(sortOrder)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Two chapters cannot share the same order.");
    }
    occupied.add(sortOrder);
  }

  for (const [index, chapter] of chapters.entries()) {
    await Chapter.findByIdAndUpdate(chapter.id, { sortOrder: -1000000 - index });
  }
  for (const chapter of chapters) {
    await Chapter.findByIdAndUpdate(chapter.id, { sortOrder: chapter.sortOrder });
  }

  const reordered = await Chapter.find({ courseId: courseIds[0] }).sort({ sortOrder: 1 });
  return reordered.map((chapter) => sanitizeChapter(chapter));
};

export const getAdminCurriculum = async (courseId) => {
  await ensureCourseExists(courseId);
  await ensureOrphanLessonsHaveChapters(courseId);
  const chapters = await Chapter.find({ courseId }).sort({ sortOrder: 1 });
  const lessons = orderLessons(chapters, await Lesson.find({ courseId }));
  const lessonsByChapter = new Map();
  for (const lesson of lessons) {
    const key = String(lesson.chapterId);
    if (!lessonsByChapter.has(key)) lessonsByChapter.set(key, []);
    lessonsByChapter.get(key).push(sanitizeLesson(lesson, { includeAnswers: true }));
  }

  return {
    chapters: chapters.map((chapter) =>
      sanitizeChapter(chapter, lessonsByChapter.get(String(chapter._id)) || [])
    ),
  };
};

const selectedChoiceIds = (answer) => {
  const ids = Array.isArray(answer?.choiceIds) ? answer.choiceIds : [];
  const unique = [...new Set(ids.map((id) => String(id || "")).filter(Boolean))];
  if (unique.length === 0 && answer?.choiceId) unique.push(String(answer.choiceId));
  return unique;
};

const surveyAnswerPresent = (type, answer) => {
  if (type === "text") return normalizeString(answer?.text).length > 0;
  if (type === "rating" || type === "scale") {
    const max = type === "rating" ? 5 : 10;
    const value = Number(answer?.value);
    return Number.isInteger(value) && value >= 1 && value <= max;
  }
  return selectedChoiceIds(answer).length > 0;
};

const gradeQuizQuestion = (question, answer, { survey = false } = {}) => {
  const type = questionTypeOf(question);
  const questionId = question._id;
  if (survey && question.optional && !surveyAnswerPresent(type, answer)) {
    return {
      graded: false,
      satisfied: true,
      answered: true,
      stored: { questionId, choiceIds: [], text: "", value: null },
    };
  }
  if (type === "multiple" || type === "single") {
    const choiceIds = type === "single" ? selectedChoiceIds(answer).slice(0, 1) : selectedChoiceIds(answer);
    const correctIds = (question.choices || []).filter((choice) => choice.isCorrect).map((choice) => String(choice._id));
    const answered = type === "single" ? choiceIds.length === 1 : choiceIds.length > 0;
    const satisfied = survey
      ? answered
      : type === "single"
        ? correctIds.length === 1 && choiceIds.length === 1 && correctIds[0] === choiceIds[0]
        : correctIds.length > 0 &&
          correctIds.length === choiceIds.length &&
          correctIds.every((id) => choiceIds.includes(id));
    return {
      graded: !survey,
      satisfied,
      answered,
      stored: { questionId, choiceIds, text: "", value: null },
    };
  }
  if (type === "rating" || type === "scale") {
    const max = type === "rating" ? 5 : 10;
    const value = Number(answer?.value);
    const satisfied = Number.isInteger(value) && value >= 1 && value <= max;
    return {
      graded: false,
      satisfied,
      answered: satisfied,
      stored: { questionId, choiceIds: [], text: "", value: satisfied ? value : null },
    };
  }
  const text = normalizeString(answer?.text).slice(0, 2000);
  const answered = text.length > 0;
  return {
    graded: false,
    satisfied: answered,
    answered,
    stored: { questionId, choiceIds: [], text, value: null },
  };
};

const quizPassingRule = (lesson) => ({
  requirePassingGrade: lesson?.requirePassingGrade !== false,
  passingGrade: Number.isInteger(lesson?.passingGrade) ? lesson.passingGrade : 100,
});

const scoreQuizAttempt = (lesson, answers) => {
  const isSurvey = lesson.contentType === "survey";
  const questions = lesson.questions || [];
  const graded = [];
  const outcomes = questions.map((question) => {
    const answer = (answers || []).find((item) => String(item.questionId) === String(question._id));
    const outcome = gradeQuizQuestion(question, answer, { survey: isSurvey });
    if (outcome.graded) graded.push(outcome.satisfied);
    return outcome;
  });
  const results = outcomes.map((outcome) => ({
    questionId: outcome.stored.questionId,
    graded: outcome.graded,
    ...(outcome.graded ? { correct: outcome.satisfied } : {}),
  }));
  const allAnswered = questions.length > 0 && outcomes.every((item) => item.answered);
  const gradedTotal = isSurvey ? 0 : graded.length;
  const gradedCorrect = graded.filter(Boolean).length;
  const correctCount = gradedTotal === 0 ? outcomes.filter((item) => item.satisfied).length : gradedCorrect;
  const total = gradedTotal === 0 ? questions.length : gradedTotal;
  const scorePercent = gradedTotal === 0 ? (allAnswered ? 100 : 0) : Math.round((gradedCorrect / gradedTotal) * 100);
  const { requirePassingGrade, passingGrade } = quizPassingRule(lesson);
  const meetsGrade = isSurvey || !requirePassingGrade || scorePercent >= passingGrade;
  const passed = isSurvey
    ? questions.length > 0 && outcomes.every((item) => item.satisfied)
    : allAnswered && meetsGrade;
  const finished = isSurvey ? passed : allAnswered;

  return { outcomes, results, passed, finished, scorePercent, correctCount, total };
};

const finalizeSubmittedAttempts = async (courseId, userId) => {
  const openAttempts = await LessonProgress.find({
    courseId,
    userId,
    isCompleted: { $ne: true },
    "responses.0": { $exists: true },
  });
  if (openAttempts.length === 0) return;

  const lessons = await Lesson.find({
    _id: { $in: openAttempts.map((progress) => progress.lessonId) },
    contentType: { $in: ["quiz", "survey"] },
  });
  const lessonsById = new Map(lessons.map((lesson) => [String(lesson._id), lesson]));
  let changed = false;
  for (const progress of openAttempts) {
    const lesson = lessonsById.get(String(progress.lessonId));
    if (!lesson) continue;
    const scored = scoreQuizAttempt(lesson, progress.responses);
    if (!scored.finished) continue;
    progress.isCompleted = true;
    progress.scorePercent = scored.scorePercent;
    progress.completedAt = progress.completedAt || new Date();
    await progress.save();
    changed = true;
  }
  if (changed) await recalculateCourseProgress(courseId, userId);
};

const rescoreQuizAttempts = async (lesson) => {
  if (lesson.contentType !== "quiz") return;
  const attempts = await LessonProgress.find({
    lessonId: lesson._id,
    "responses.0": { $exists: true },
  });
  for (const progress of attempts) {
    const scored = scoreQuizAttempt(lesson, progress.responses);
    const wasCompleted = Boolean(progress.isCompleted);
    progress.scorePercent = scored.scorePercent;
    if (scored.finished) {
      progress.isCompleted = true;
      progress.completedAt = progress.completedAt || new Date();
    }
    await progress.save();
    if (wasCompleted !== progress.isCompleted) {
      await recalculateCourseProgress(lesson.courseId, progress.userId);
    }
  }
};

export const submitQuiz = async (lessonId, userId, answers) => {
  const lesson = await ensureLessonExists(lessonId);
  await assertLearnerCanStudyLesson(lesson, userId);

  if (lesson.contentType !== "quiz" && lesson.contentType !== "survey") {
    throw new ApiError(httpStatus.BAD_REQUEST, "This lesson is not a quiz or survey.");
  }

  const existing = await LessonProgress.findOne({ lessonId, userId });
  if (existing?.isCompleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, "This lesson has already been submitted.");
  }

  const scored = scoreQuizAttempt(lesson, answers);
  const progress = await LessonProgress.findOneAndUpdate(
    { lessonId, userId },
    {
      courseId: lesson.courseId,
      responses: scored.outcomes.map((item) => item.stored),
      scorePercent: scored.scorePercent,
      ...(scored.finished
        ? {
            isCompleted: true,
            completedAt: existing?.completedAt || new Date(),
          }
        : {}),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const enrollment = scored.finished
    ? await recalculateCourseProgress(lesson.courseId, userId)
    : await getEnrollment(lesson.courseId, userId);

  return {
    scorePercent: scored.scorePercent,
    passed: scored.passed,
    completed: scored.finished,
    correctCount: scored.correctCount,
    total: scored.total,
    results: scored.results,
    progress: progress ? sanitizeProgress(progress) : null,
    enrollment: enrollment ? sanitizeEnrollment(enrollment) : null,
  };
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
