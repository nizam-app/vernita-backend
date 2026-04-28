import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { requireCloudinary } from "../config/cloudinary.js";
import httpStatus from "../constants/httpStatus.js";
import ApiError from "../utils/api-error.js";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
]);

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(
      new ApiError(
        httpStatus.BAD_REQUEST,
        "Only image files are allowed (jpg, jpeg, png, webp)."
      )
    );
  }
  cb(null, true);
};

const createUploadMiddleware = () => {
  const storage = new CloudinaryStorage({
    cloudinary: requireCloudinary(),
    params: async () => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      return {
        folder: process.env.CLOUDINARY_FOLDER || "vernita/uploads",
        resource_type: "image",
        public_id: unique,
        overwrite: false,
      };
    },
  });

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }).single("image");
};

const createUploadFieldsMiddleware = (fields) => {
  const storage = new CloudinaryStorage({
    cloudinary: requireCloudinary(),
    params: async () => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      return {
        folder: process.env.CLOUDINARY_FOLDER || "vernita/uploads",
        resource_type: "image",
        public_id: unique,
        overwrite: false,
      };
    },
  });

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }).fields(fields);
};

export const uploadImage = (req, res, next) => {
  try {
    return createUploadMiddleware()(req, res, next);
  } catch (err) {
    return next(
      err instanceof ApiError
        ? err
        : new ApiError(
            err?.message?.startsWith("Missing env:")
              ? httpStatus.BAD_REQUEST
              : httpStatus.INTERNAL_SERVER_ERROR,
            err.message ||
              (err?.message?.startsWith("Missing env:")
                ? "Cloudinary environment variables are missing."
                : "Upload failed.")
          )
    );
  }
};

export const uploadWebinarImages = (req, res, next) => {
  try {
    return createUploadFieldsMiddleware([
      { name: "coverImage", maxCount: 1 },
      // Support legacy key that your Postman is using as a FILE field
      { name: "coverImageUrl", maxCount: 1 },
      { name: "speakerImage", maxCount: 1 },
      // Support bracket-style multipart keys from Postman
      { name: "speaker[imageUrl]", maxCount: 1 },
    ])(req, res, next);
  } catch (err) {
    return next(
      err instanceof ApiError
        ? err
        : new ApiError(
            err?.message?.startsWith("Missing env:")
              ? httpStatus.BAD_REQUEST
              : httpStatus.INTERNAL_SERVER_ERROR,
            err.message ||
              (err?.message?.startsWith("Missing env:")
                ? "Cloudinary environment variables are missing."
                : "Upload failed.")
          )
    );
  }
};

