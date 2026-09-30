import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { deleteMyAccount } from "./user.account.service.js";
import { validateDeleteAccount } from "./user.validation.js";
import * as userService from "./user.service.js";

export const getProfile = catchAsync(async (req, res) => {
  return sendResponse(res, {
    statusCode: 200,
    message: "User profile fetched successfully.",
    data: userService.sanitizeUser(req.user),
  });
});

export const getProfileDashboard = catchAsync(async (req, res) => {
  const data = await userService.getProfileDashboard(req.user._id);

  return sendResponse(res, {
    statusCode: 200,
    message: "Profile dashboard fetched successfully.",
    data,
  });
});

export const deleteAccount = catchAsync(async (req, res) => {
  const { password } = validateDeleteAccount(req.body);
  const result = await deleteMyAccount(req.user._id, { password });

  return sendResponse(res, {
    statusCode: 200,
    message: "Your account has been permanently deleted.",
    data: result,
  });
});
