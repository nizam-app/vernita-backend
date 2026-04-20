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

export const createWebinar = catchAsync(async (req, res) => {
  validateCreateWebinar(req.body);
  const webinar = await webinarService.createWebinar(req.body, req.user?._id);

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
  validateUpdateWebinar(req.body);
  const webinar = await webinarService.updateWebinar(req.params.id, req.body);

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
