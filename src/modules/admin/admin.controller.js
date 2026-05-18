import httpStatus from "../../constants/httpStatus.js";
import { catchAsync as asyncHandler } from "../../utils/catchAsync.js";
import ApiResponse from "../../utils/api-response.js";
import * as adminService from "./admin.service.js";

export const getUsers = asyncHandler(async (req, res) => {
  const result = await adminService.getUsers(req.query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Users fetched successfully.",
    data: result.items,
    meta: result.meta,
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await adminService.getUserById(req.params.userId);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "User profile fetched successfully.",
    data: user,
  });
});

export const updateUserById = asyncHandler(async (req, res) => {
  const user = await adminService.updateUserById(req.params.userId, req.body);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'User updated successfully.',
    data: user,
  });
});

export const deleteUserById = asyncHandler(async (req, res) => {
  const user = await adminService.deleteUserById(req.params.userId);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'User deleted successfully.',
    data: user,
  });
});
