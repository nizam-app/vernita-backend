import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { sanitizeUser } from "./user.service.js";

export const getProfile = catchAsync(async (req, res) => {
  return sendResponse(res, {
    statusCode: 200,
    message: "User profile fetched successfully.",
    data: sanitizeUser(req.user),
  });
});
