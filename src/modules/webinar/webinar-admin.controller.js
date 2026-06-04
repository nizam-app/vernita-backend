import httpStatus from "../../constants/httpStatus.js";
import { catchAsync } from "../../utils/catchAsync.js";
import ApiResponse from "../../utils/api-response.js";
import * as webinarService from "./webinar.service.js";
import {
  validateCreateWebinar,
  validatePaymentCompletion,
  validatePublishWebinar,
  validateRegistrationIdParam,
  validateUpdateWebinar,
  validateWebinarIdParam,
  validateWebinarListQuery,
  validateWebinarStatusUpdate,
} from "./webinar.validation.js";

const parseJsonIfString = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const normalizeMultipartWebinarBody = (body = {}) => {
  const next = { ...body };

  const parseMaybeNumber = (value) => {
    if (value === undefined || value === null) return value;
    if (typeof value === "number") return value;
    if (typeof value !== "string") return value;
    const cleaned = value.trim().replace(/,$/, "");
    if (cleaned === "") return value;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : value;
  };

  const parseMaybeBoolean = (value) => {
    if (value === undefined || value === null) return value;
    if (typeof value === "boolean") return value;
    if (typeof value !== "string") return value;
    const cleaned = value.trim().replace(/,$/, "").toLowerCase();
    if (cleaned === "true") return true;
    if (cleaned === "false") return false;
    return value;
  };

  // Support multipart keys: speaker[name], speaker[title], speaker[bio]
  const speakerName = next["speaker[name]"];
  const speakerTitle = next["speaker[title]"];
  const speakerBio = next["speaker[bio]"];
  if (speakerName !== undefined || speakerTitle !== undefined || speakerBio !== undefined) {
    next.speaker = next.speaker && typeof next.speaker === "object" ? next.speaker : {};
    if (speakerName !== undefined) next.speaker.name = speakerName;
    if (speakerTitle !== undefined) next.speaker.title = speakerTitle;
    if (speakerBio !== undefined) next.speaker.bio = speakerBio;
    delete next["speaker[name]"];
    delete next["speaker[title]"];
    delete next["speaker[bio]"];
  }

  // Parse JSON strings if sent as JSON-in-text
  if (next.speaker) next.speaker = parseJsonIfString(next.speaker);
  if (next.tags) next.tags = parseJsonIfString(next.tags);

  // Coerce common primitives from multipart strings
  if (next.durationMinutes !== undefined) next.durationMinutes = parseMaybeNumber(next.durationMinutes);
  if (next.price !== undefined) next.price = parseMaybeNumber(next.price);
  if (next.maxSeats !== undefined) next.maxSeats = parseMaybeNumber(next.maxSeats);
  if (next.isPaid !== undefined) next.isPaid = parseMaybeBoolean(next.isPaid);

  return next;
};

export const createWebinar = catchAsync(async (req, res) => {
  req.body = normalizeMultipartWebinarBody(req.body);

  validateCreateWebinar(req.body);
  const webinar = await webinarService.createWebinarWithFiles({
    payload: req.body,
    files: req.files,
    adminUserId: req.user?._id,
  });

  return ApiResponse.success(res, {
    statusCode: httpStatus.CREATED,
    message: "Webinar created successfully.",
    data: webinar,
  });
});

export const getAdminWebinars = catchAsync(async (req, res) => {
  const query = validateWebinarListQuery(req.query);
  const result = await webinarService.getAdminWebinars(query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Admin webinars fetched successfully.",
    data: result.items,
    meta: result.meta,
  });
});

export const getAdminWebinarById = catchAsync(async (req, res) => {
  validateWebinarIdParam(req.params.id);
  const webinar = await webinarService.getAdminWebinarById(req.params.id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Webinar fetched successfully.",
    data: webinar,
  });
});

export const updateWebinar = catchAsync(async (req, res) => {
  validateWebinarIdParam(req.params.id);
  req.body = normalizeMultipartWebinarBody(req.body);
  validateUpdateWebinar(req.body);
  const webinar = await webinarService.updateWebinarWithFiles({
    webinarId: req.params.id,
    payload: req.body,
    files: req.files,
  });

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Webinar updated successfully.",
    data: webinar,
  });
});

export const deleteWebinar = catchAsync(async (req, res) => {
  validateWebinarIdParam(req.params.id);
  const webinar = await webinarService.deleteWebinar(req.params.id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Webinar deleted successfully.",
    data: webinar,
  });
});

export const publishWebinar = catchAsync(async (req, res) => {
  validateWebinarIdParam(req.params.id);
  validatePublishWebinar(req.body);
  const webinar = await webinarService.publishWebinar(req.params.id, req.body.isPublished);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: `Webinar ${req.body.isPublished ? "published" : "unpublished"} successfully.`,
    data: webinar,
  });
});

export const updateWebinarStatus = catchAsync(async (req, res) => {
  validateWebinarIdParam(req.params.id);
  validateWebinarStatusUpdate(req.body);
  const webinar = await webinarService.updateWebinarStatus(req.params.id, req.body.status);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Webinar status updated successfully.",
    data: webinar,
  });
});

export const getWebinarRegistrations = catchAsync(async (req, res) => {
  validateWebinarIdParam(req.params.id);
  const registrations = await webinarService.getWebinarRegistrations(req.params.id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Webinar registrations fetched successfully.",
    data: registrations,
  });
});

export const completeRegistrationPayment = catchAsync(async (req, res) => {
  validateWebinarIdParam(req.params.id);
  validateRegistrationIdParam(req.params.registrationId);
  const paymentPayload = validatePaymentCompletion(req.body);
  const result = await webinarService.completeWebinarRegistrationPayment(
    req.params.id,
    req.params.registrationId,
    paymentPayload
  );

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Webinar registration payment marked as completed.",
    data: result,
  });
});
