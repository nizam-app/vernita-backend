import httpStatus from "../../constants/httpStatus.js";
import ApiResponse from "../../utils/api-response.js";
import { catchAsync } from "../../utils/catchAsync.js";
import * as reportService from "./report.service.js";

export const totalUserGrowth = catchAsync(async (req, res) => {
  const data = await reportService.getTotalUserGrowth(req.query);
  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "User growth report fetched successfully.",
    data,
  });
});

export const revenueReport = catchAsync(async (req, res) => {
  const data = await reportService.getRevenueReport(req.query);
  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Revenue report fetched successfully.",
    data,
  });
});

export const coursePerformance = catchAsync(async (req, res) => {
  const data = await reportService.getCoursePerformanceReport(req.query);
  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Course performance report fetched successfully.",
    data,
  });
});

export const webinarPerformance = catchAsync(async (req, res) => {
  const data = await reportService.getWebinarPerformanceReport(req.query);
  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Webinar performance report fetched successfully.",
    data,
  });
});

export const coachingSales = catchAsync(async (req, res) => {
  const data = await reportService.getCoachingSalesReport(req.query);
  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Coaching sales report fetched successfully.",
    data,
  });
});

