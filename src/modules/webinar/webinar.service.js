import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../utils/api-error.js";
import { User } from "../user/user.model.js";
import {
  Webinar,
  WEBINAR_STATUSES,
} from "./webinar.model.js";
import {
  WebinarRegistration,
} from "./webinar-registration.model.js";

const ACTIVE_REGISTRATION_STATUSES = ["registered", "pending_payment"];

const normalizeString = (value) => String(value || "").trim();

const normalizeWebinarPayload = (payload) => {
  const normalized = { ...payload };

  if (normalized.title !== undefined) normalized.title = normalizeString(normalized.title);
  if (normalized.description !== undefined) {
    normalized.description = normalizeString(normalized.description);
  }
  if (normalized.category !== undefined) normalized.category = normalizeString(normalized.category);
  if (normalized.timezone !== undefined) normalized.timezone = normalizeString(normalized.timezone);
  if (normalized.currency !== undefined) {
    normalized.currency = normalizeString(normalized.currency).toUpperCase();
  }
  if (normalized.joinLink !== undefined) normalized.joinLink = normalizeString(normalized.joinLink);
  if (normalized.coverImageUrl !== undefined) {
    normalized.coverImageUrl = normalizeString(normalized.coverImageUrl);
  }
  if (normalized.tags !== undefined) {
    normalized.tags = normalized.tags
      .map((tag) => normalizeString(tag))
      .filter(Boolean);
  }
  if (normalized.speaker !== undefined) {
    normalized.speaker = {
      name: normalizeString(normalized.speaker.name),
      title: normalizeString(normalized.speaker.title),
      bio: normalizeString(normalized.speaker.bio),
      imageUrl: normalizeString(normalized.speaker.imageUrl),
    };
  }
  if (normalized.scheduledAt !== undefined) {
    normalized.scheduledAt = new Date(normalized.scheduledAt);
  }

  if (normalized.price !== undefined && normalized.price === 0) {
    normalized.isPaid = false;
  }

  if (normalized.isPaid === false) {
    normalized.price = 0;
  }

  if (normalized.status === "draft") {
    normalized.isPublished = false;
  }

  return normalized;
};

const sanitizeSpeaker = (speaker) => ({
  name: speaker?.name || "",
  title: speaker?.title || "",
  bio: speaker?.bio || "",
  imageUrl: speaker?.imageUrl || "",
});

const sanitizeWebinarBase = (webinar) => ({
  id: webinar._id,
  title: webinar.title,
  description: webinar.description,
  category: webinar.category,
  speaker: sanitizeSpeaker(webinar.speaker),
  scheduledAt: webinar.scheduledAt,
  durationMinutes: webinar.durationMinutes,
  timezone: webinar.timezone,
  price: webinar.price,
  currency: webinar.currency,
  isPaid: webinar.isPaid,
  status: webinar.status,
  isPublished: webinar.isPublished,
  coverImageUrl: webinar.coverImageUrl,
  tags: webinar.tags || [],
  maxSeats: webinar.maxSeats,
  registeredCount: webinar.registeredCount || 0,
  createdBy: webinar.createdBy || null,
  publishedAt: webinar.publishedAt,
  createdAt: webinar.createdAt,
  updatedAt: webinar.updatedAt,
});

export const sanitizeAdminWebinar = (webinar) => ({
  ...sanitizeWebinarBase(webinar),
  joinLink: webinar.joinLink || "",
  isDeleted: webinar.isDeleted,
  deletedAt: webinar.deletedAt,
});

export const sanitizePublicWebinar = (webinar) => sanitizeWebinarBase(webinar);

export const sanitizeRegistration = (registration) => ({
  id: registration._id,
  webinarId: registration.webinarId,
  userId: registration.userId,
  amount: registration.amount,
  currency: registration.currency,
  isPaidWebinar: registration.isPaidWebinar,
  registrationStatus: registration.registrationStatus,
  paymentStatus: registration.paymentStatus,
  paymentReference: registration.paymentReference || "",
  paymentProvider: registration.paymentProvider || "",
  joinedAt: registration.joinedAt,
  lastJoinAt: registration.lastJoinAt,
  createdAt: registration.createdAt,
  updatedAt: registration.updatedAt,
});

const buildWebinarFilter = (query = {}, { publicOnly = false } = {}) => {
  const filter = { isDeleted: false };

  if (publicOnly) {
    filter.isPublished = true;
  }

  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.isPublished !== undefined && !publicOnly) {
    filter.isPublished = query.isPublished;
  }
  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: "i" } },
      { description: { $regex: query.search, $options: "i" } },
      { category: { $regex: query.search, $options: "i" } },
      { "speaker.name": { $regex: query.search, $options: "i" } },
    ];
  }

  return filter;
};

const buildSort = (query = {}, fallback = { scheduledAt: 1, createdAt: -1 }) => {
  const sortBy = query.sortBy || Object.keys(fallback)[0];
  const sortOrder = query.sortOrder ?? fallback[sortBy] ?? 1;

  return {
    [sortBy]: sortOrder,
    createdAt: sortBy === "createdAt" ? sortOrder : -1,
  };
};

const buildPaginationMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

const ensureWebinarExists = async (webinarId, { publicOnly = false } = {}) => {
  const filter = { _id: webinarId, isDeleted: false };
  if (publicOnly) filter.isPublished = true;

  const webinar = await Webinar.findOne(filter);
  if (!webinar) {
    throw new ApiError(httpStatus.NOT_FOUND, "Webinar not found.");
  }

  return webinar;
};

const ensureRegistrationOpen = (webinar) => {
  if (!webinar.isPublished) {
    throw new ApiError(httpStatus.FORBIDDEN, "Only published webinars can be registered.");
  }

  if (["draft", "completed", "canceled"].includes(webinar.status)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This webinar is not open for registration."
    );
  }
};

const ensureSeatsAvailable = async (webinar) => {
  if (!webinar.maxSeats) return;

  const count = await WebinarRegistration.countDocuments({
    webinarId: webinar._id,
    registrationStatus: { $in: ACTIVE_REGISTRATION_STATUSES },
  });

  if (count >= webinar.maxSeats) {
    throw new ApiError(httpStatus.CONFLICT, "No seats left for this webinar.");
  }
};

const ensureNoDuplicateRegistration = async (webinarId, userId) => {
  const existing = await WebinarRegistration.findOne({ webinarId, userId });

  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, "User is already registered for this webinar.");
  }
};

const recalculateRegisteredCount = async (webinarId) => {
  const count = await WebinarRegistration.countDocuments({
    webinarId,
    registrationStatus: { $in: ACTIVE_REGISTRATION_STATUSES },
  });

  await Webinar.findByIdAndUpdate(webinarId, { registeredCount: count });
};

const buildRegistrationResponse = ({ webinar, registration, paymentRequired = false }) => ({
  webinar: sanitizePublicWebinar(webinar),
  registration: sanitizeRegistration(registration),
  paymentRequired,
});

export const createWebinar = async (payload, adminUserId) => {
  const normalizedPayload = normalizeWebinarPayload(payload);

  const webinar = await Webinar.create({
    ...normalizedPayload,
    createdBy: adminUserId || null,
    publishedAt: normalizedPayload.isPublished ? new Date() : null,
  });

  return sanitizeAdminWebinar(webinar);
};

export const getAdminWebinars = async (query) => {
  const filter = buildWebinarFilter(query);
  const total = await Webinar.countDocuments(filter);
  const webinars = await Webinar.find(filter)
    .sort(buildSort(query))
    .skip((query.page - 1) * query.limit)
    .limit(query.limit);

  return {
    items: webinars.map(sanitizeAdminWebinar),
    meta: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
  };
};

export const getAdminWebinarById = async (webinarId) => {
  const webinar = await ensureWebinarExists(webinarId);
  return sanitizeAdminWebinar(webinar);
};

export const updateWebinar = async (webinarId, payload) => {
  const webinar = await ensureWebinarExists(webinarId);
  const normalizedPayload = normalizeWebinarPayload(payload);

  if (normalizedPayload.status === "canceled") {
    normalizedPayload.isPublished = webinar.isPublished;
  }

  Object.assign(webinar, normalizedPayload);

  if (normalizedPayload.isPublished === true && !webinar.publishedAt) {
    webinar.publishedAt = new Date();
  }

  if (normalizedPayload.isPublished === false) {
    webinar.publishedAt = null;
  }

  await webinar.save();

  return sanitizeAdminWebinar(webinar);
};

export const deleteWebinar = async (webinarId) => {
  const webinar = await ensureWebinarExists(webinarId);

  webinar.isDeleted = true;
  webinar.deletedAt = new Date();
  webinar.isPublished = false;
  await webinar.save();

  return sanitizeAdminWebinar(webinar);
};

export const publishWebinar = async (webinarId, isPublished) => {
  const webinar = await ensureWebinarExists(webinarId);

  if (isPublished && webinar.status === "draft") {
    webinar.status = "upcoming";
  }

  webinar.isPublished = isPublished;
  webinar.publishedAt = isPublished ? new Date() : null;
  await webinar.save();

  return sanitizeAdminWebinar(webinar);
};

export const updateWebinarStatus = async (webinarId, status) => {
  if (!WEBINAR_STATUSES.includes(status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid webinar status.");
  }

  const webinar = await ensureWebinarExists(webinarId);
  webinar.status = status;

  if (status === "draft") {
    webinar.isPublished = false;
    webinar.publishedAt = null;
  }

  await webinar.save();
  return sanitizeAdminWebinar(webinar);
};

export const getWebinarRegistrations = async (webinarId) => {
  await ensureWebinarExists(webinarId);

  const registrations = await WebinarRegistration.find({ webinarId })
    .populate("userId", "name email role isActive isBlocked")
    .sort({ createdAt: -1 });

  return registrations.map((registration) => ({
    ...sanitizeRegistration(registration),
    user: registration.userId
      ? {
          id: registration.userId._id,
          name: registration.userId.name || null,
          email: registration.userId.email || null,
          role: registration.userId.role,
          isActive: registration.userId.isActive,
          isBlocked: registration.userId.isBlocked,
        }
      : null,
  }));
};

export const getPublishedWebinars = async (query) => {
  const filter = buildWebinarFilter(query, { publicOnly: true });
  const total = await Webinar.countDocuments(filter);
  const webinars = await Webinar.find(filter)
    .sort(buildSort(query))
    .skip((query.page - 1) * query.limit)
    .limit(query.limit);

  return {
    items: webinars.map(sanitizePublicWebinar),
    meta: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
  };
};

export const getPublishedWebinarCategories = async () => {
  const categories = await Webinar.distinct("category", {
    isDeleted: false,
    isPublished: true,
  });

  return categories.filter(Boolean).sort((a, b) => a.localeCompare(b));
};

export const getPublishedWebinarById = async (webinarId) => {
  const webinar = await ensureWebinarExists(webinarId, { publicOnly: true });
  return sanitizePublicWebinar(webinar);
};

export const registerForWebinar = async (webinarId, userId) => {
  const webinar = await ensureWebinarExists(webinarId, { publicOnly: true });
  const user = await User.findById(userId);

  if (!user || !user.isActive || user.isBlocked) {
    throw new ApiError(httpStatus.FORBIDDEN, "Only active users can register.");
  }

  ensureRegistrationOpen(webinar);
  await ensureSeatsAvailable(webinar);
  await ensureNoDuplicateRegistration(webinar._id, userId);

  const registration = await WebinarRegistration.create({
    webinarId: webinar._id,
    userId,
    amount: webinar.price,
    currency: webinar.currency,
    isPaidWebinar: webinar.isPaid,
    registrationStatus: webinar.isPaid ? "pending_payment" : "registered",
    paymentStatus: webinar.isPaid ? "pending" : "not_required",
  });

  await recalculateRegisteredCount(webinar._id);

  return buildRegistrationResponse({
    webinar,
    registration,
    paymentRequired: webinar.isPaid,
  });
};

export const getMyWebinars = async (userId) => {
  const registrations = await WebinarRegistration.find({ userId })
    .populate({
      path: "webinarId",
      match: { isDeleted: false },
    })
    .sort({ createdAt: -1 });

  return registrations
    .filter((registration) => registration.webinarId)
    .map((registration) => ({
      webinar: sanitizePublicWebinar(registration.webinarId),
      registration: sanitizeRegistration(registration),
    }));
};

export const getMyWebinarsPaginated = async (userId, query) => {
  const registrations = await WebinarRegistration.find({ userId })
    .populate({
      path: "webinarId",
      match: {
        isDeleted: false,
        ...(query.status ? { status: query.status } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.search
          ? {
              $or: [
                { title: { $regex: query.search, $options: "i" } },
                { description: { $regex: query.search, $options: "i" } },
                { category: { $regex: query.search, $options: "i" } },
              ],
            }
          : {}),
      },
    })
    .sort({ createdAt: -1 });

  const filtered = registrations
    .filter((registration) => registration.webinarId)
    .map((registration) => ({
      webinar: sanitizePublicWebinar(registration.webinarId),
      registration: sanitizeRegistration(registration),
    }));

  const total = filtered.length;
  const start = (query.page - 1) * query.limit;
  const items = filtered.slice(start, start + query.limit);

  return {
    items,
    meta: buildPaginationMeta({ page: query.page, limit: query.limit, total }),
  };
};

export const joinWebinarSession = async (webinarId, userId) => {
  const webinar = await ensureWebinarExists(webinarId, { publicOnly: true });

  if (webinar.status === "canceled") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Canceled webinars cannot be joined.");
  }

  const registration = await WebinarRegistration.findOne({
    webinarId,
    userId,
    registrationStatus: { $in: ACTIVE_REGISTRATION_STATUSES },
  });

  if (!registration) {
    throw new ApiError(httpStatus.FORBIDDEN, "Only registered users can join this webinar.");
  }

  if (webinar.isPaid && registration.paymentStatus !== "completed") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Payment must be completed before joining this webinar."
    );
  }

  if (!webinar.joinLink) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Join link is not available yet.");
  }

  const now = new Date();
  if (!registration.joinedAt) {
    registration.joinedAt = now;
  }
  registration.lastJoinAt = now;
  await registration.save();

  return {
    webinar: sanitizePublicWebinar(webinar),
    joinLink: webinar.joinLink,
    registration: sanitizeRegistration(registration),
  };
};

export const completeWebinarRegistrationPayment = async (
  webinarId,
  registrationId,
  payload = {}
) => {
  const webinar = await ensureWebinarExists(webinarId);

  const registration = await WebinarRegistration.findOne({
    _id: registrationId,
    webinarId,
  });

  if (!registration) {
    throw new ApiError(httpStatus.NOT_FOUND, "Webinar registration not found.");
  }

  if (!webinar.isPaid) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Payment completion is only applicable to paid webinars."
    );
  }

  if (registration.paymentStatus === "completed") {
    return {
      webinar: sanitizeAdminWebinar(webinar),
      registration: sanitizeRegistration(registration),
    };
  }

  registration.paymentStatus = "completed";
  registration.registrationStatus = "registered";
  registration.paymentReference =
    payload.paymentReference || registration.paymentReference || `manual-${registration._id}`;
  registration.paymentProvider =
    payload.paymentProvider || registration.paymentProvider || "manual";
  await registration.save();

  await recalculateRegisteredCount(webinarId);

  return {
    webinar: sanitizeAdminWebinar(webinar),
    registration: sanitizeRegistration(registration),
  };
};
