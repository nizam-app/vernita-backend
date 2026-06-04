import httpStatus from "../../constants/httpStatus.js";
import ApiResponse from "../../utils/api-response.js";
import { catchAsync } from "../../utils/catchAsync.js";
import ApiError from "../../utils/api-error.js";
import { Notification } from "./notification.model.js";

const ensureMongoId = (value, fieldName) => {
  if (!value || typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${fieldName} must be a valid id.`);
  }
};

const toPositiveInt = (value, fallback) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

export const getMyNotifications = catchAsync(async (req, res) => {
  const page = toPositiveInt(req.query.page, 1);
  const limit = Math.min(toPositiveInt(req.query.limit, 20), 100);
  const skip = (page - 1) * limit;

  const filter = { userId: req.user._id };
  const [total, items] = await Promise.all([
    Notification.countDocuments(filter),
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Notifications fetched successfully.",
    data: items.map((n) => ({
      id: n._id,
      type: n.type,
      channel: n.channel,
      title: n.title,
      body: n.body,
      data: n.data,
      scheduledFor: n.scheduledFor,
      sentAt: n.sentAt,
      readAt: n.readAt,
      status: n.status,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  });
});

export const markNotificationRead = catchAsync(async (req, res) => {
  ensureMongoId(req.params.id, "id");
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { readAt: new Date() },
    { new: true }
  );
  if (!n) throw new ApiError(httpStatus.NOT_FOUND, "Notification not found.");

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Notification marked as read.",
    data: { id: n._id, readAt: n.readAt },
  });
});

export const markAllNotificationsRead = catchAsync(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, readAt: null },
    { $set: { readAt: new Date() } }
  );

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "All notifications marked as read.",
    data: true,
  });
});

