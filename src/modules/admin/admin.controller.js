import httpStatus from "../../constants/httpStatus.js";
import { catchAsync as asyncHandler } from "../../utils/catchAsync.js";
import ApiResponse from "../../utils/api-response.js";
import * as adminService from "./admin.service.js";

export const getUsers = asyncHandler(async (req, res) => {
  const users = await adminService.getUsers();

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Users fetched successfully.',
    data: users,
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await adminService.getUserById(req.params.userId);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'User fetched successfully.',
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
