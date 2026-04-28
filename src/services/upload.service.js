import httpStatus from "../constants/httpStatus.js";
import ApiError from "../utils/api-error.js";
import { requireCloudinary } from "../config/cloudinary.js";

export const getUploadedImageInfo = (file) => {
  if (!file) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Image file is required.");
  }

  // multer-storage-cloudinary exposes `path` as the secure URL
  const url = file.path || file.secure_url || null;
  const public_id = file.filename || file.public_id || null;

  if (!url || !public_id) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Upload failed.");
  }

  return { url, public_id };
};

export const deleteImage = async (publicId) => {
  if (!publicId) return { result: "skipped" };

  try {
    const cloudinary = requireCloudinary();
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });

    return result;
  } catch (err) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to delete image from Cloudinary."
    );
  }
};

