import httpStatus from "../constants/httpStatus.js";
import ApiError from "../utils/api-error.js";
import { requireCloudinary } from "../config/cloudinary.js";

export const getUploadedAssetInfo = (file) => {
  if (!file) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Uploaded file is required.");
  }

  // multer-storage-cloudinary exposes `path` as the secure URL
  const url = file.path || file.secure_url || null;
  const public_id = file.filename || file.public_id || null;

  if (!url || !public_id) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Upload failed.");
  }

  return { url, public_id };
};

export const getUploadedImageInfo = (file) => getUploadedAssetInfo(file);

export const deleteCloudinaryAsset = async (publicId, resourceType = "image") => {
  if (!publicId) return { result: "skipped" };

  try {
    const cloudinary = requireCloudinary();
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
  } catch (err) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to delete asset from Cloudinary."
    );
  }
};

export const deleteImage = async (publicId) => deleteCloudinaryAsset(publicId, "image");

