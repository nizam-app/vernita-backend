import httpStatus from "../../constants/httpStatus.js";
import ApiResponse from "../../utils/api-response.js";
import { catchAsync } from "../../utils/catchAsync.js";
import ApiError from "../../utils/api-error.js";
import { Notification } from "./notification.model.js";
import { User } from "../user/user.model.js";
import { CourseEnrollment } from "../course/course-enrollment.model.js";

const ensureMongoId = (value, fieldName) => {
  if (!value || typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a valid id.`);
  }
};

const ensureString = (value, fieldName, required = false) => {
  if (value === undefined && !required) return;
  if (typeof value !== "string" || (required && !value.trim())) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a non-empty string.`);
  }
};

const ensureStringArray = (value, fieldName) => {
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be an array of strings.`);
  }
};

export const adminSendSystemNotification = catchAsync(async (req, res) => {
  const { userIds, title, body, data } = req.body || {};
  ensureStringArray(userIds, "userIds");
  ensureString(title, "title", true);
  ensureString(body, "body", true);

  const ids = userIds.filter(Boolean);
  const users = await User.find({ _id: { $in: ids } }).select("_id");
  const now = new Date();

  const docs = users.map((u) => ({
    userId: u._id,
    type: "system",
    channel: "in_app",
    title: title.trim(),
    body: body.trim(),
    data: data && typeof data === "object" ? data : {},
    scheduledFor: now,
    status: "pending",
    dedupeKey: `system:${now.getTime()}:${u._id}`,
  }));

  if (docs.length > 0) await Notification.insertMany(docs, { ordered: false });

  return ApiResponse.success(res, {
    statusCode: httpStatus.CREATED,
    message: "System notifications queued.",
    data: { queued: docs.length },
  });
});

export const adminSendCourseAnnouncement = catchAsync(async (req, res) => {
  const { courseId, title, body, data } = req.body || {};
  ensureMongoId(courseId, "courseId");
  ensureString(title, "title", true);
  ensureString(body, "body", true);

  const enrollments = await CourseEnrollment.find({ courseId }).select("userId");
  const userIds = enrollments.map((e) => e.userId);

  const now = new Date();
  const dedupeBase = `course_announcement:${courseId}:${now.toISOString()}`;
  const docs = userIds.map((userId) => ({
    userId,
    type: "course_announcement",
    channel: "in_app",
    title: title.trim(),
    body: body.trim(),
    data: { ...(data && typeof data === "object" ? data : {}), courseId },
    scheduledFor: now,
    status: "pending",
    dedupeKey: `${dedupeBase}:${userId}`,
  }));

  if (docs.length > 0) await Notification.insertMany(docs, { ordered: false });

  return ApiResponse.success(res, {
    statusCode: httpStatus.CREATED,
    message: "Course announcement queued.",
    data: { courseId, queued: docs.length },
  });
});

