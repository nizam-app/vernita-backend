const asyncHandler = require('../../utils/async-handler');
const ApiResponse = require('../../utils/api-response');
const httpStatus = require('../../constants/http-status');
const adminService = require('./admin.service');

const getUsers = asyncHandler(async (req, res) => {
  const users = await adminService.getUsers();

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'Users fetched successfully.',
    data: users,
  });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await adminService.getUserById(req.params.userId);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'User fetched successfully.',
    data: user,
  });
});

const updateUserById = asyncHandler(async (req, res) => {
  const user = await adminService.updateUserById(req.params.userId, req.body);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'User updated successfully.',
    data: user,
  });
});

const deleteUserById = asyncHandler(async (req, res) => {
  const user = await adminService.deleteUserById(req.params.userId);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: 'User deleted successfully.',
    data: user,
  });
});

module.exports = {
  getUsers,
  getUserById,
  updateUserById,
  deleteUserById,
};
