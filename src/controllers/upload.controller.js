import httpStatus from "../constants/httpStatus.js";
import { catchAsync as asyncHandler } from "../utils/catchAsync.js";
import ApiResponse from "../utils/api-response.js";
import { getUploadedImageInfo } from "../services/upload.service.js";

export const uploadSingleImage = asyncHandler(async (req, res) => {
  const image = getUploadedImageInfo(req.file);

  return ApiResponse.success(res, {
    statusCode: httpStatus.CREATED,
    message: "Image uploaded successfully.",
    data: image,
  });
});

