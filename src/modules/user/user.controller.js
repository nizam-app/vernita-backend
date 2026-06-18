import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
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
