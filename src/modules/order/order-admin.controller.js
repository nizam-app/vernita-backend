import httpStatus from "../../constants/httpStatus.js";
import { catchAsync as asyncHandler } from "../../utils/catchAsync.js";
import ApiResponse from "../../utils/api-response.js";
import * as orderAdminService from "./order-admin.service.js";
import {
  validateAdminOrderIdParam,
  validateAdminOrderListQuery,
  validateAdminRevenueQuery,
} from "./order-admin.validation.js";

export const adminListOrders = asyncHandler(async (req, res) => {
  const query = validateAdminOrderListQuery(req.query);
  const result = await orderAdminService.listAdminOrders(query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Orders fetched successfully.",
    data: result.data,
    meta: result.meta,
  });
});

export const adminGetOrderById = asyncHandler(async (req, res) => {
  validateAdminOrderIdParam(req.params);
  const order = await orderAdminService.getAdminOrderById(req.params.orderId);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Order fetched successfully.",
    data: order,
  });
});

export const adminRevenueReport = asyncHandler(async (req, res) => {
  const query = validateAdminRevenueQuery(req.query);
  const report = await orderAdminService.getAdminRevenueReport(query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Revenue report fetched successfully.",
    data: report,
  });
});

