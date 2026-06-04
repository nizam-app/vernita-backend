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

export const uploadCourseBanner = (req, res, next) => {
  try {
    return createUploadFieldsMiddleware([
      { name: "bannerImage", maxCount: 1 },
      { name: "bannerImageUrl", maxCount: 1 },
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

export const uploadCoachingPackageImages = (req, res, next) => {
  try {
    return createUploadFieldsMiddleware([
      { name: "thumbnail", maxCount: 1 },
      { name: "thumbnailUrl", maxCount: 1 },
      { name: "bannerImage", maxCount: 1 },
      { name: "bannerImageUrl", maxCount: 1 },
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

const LESSON_VIDEO_FIELDS = new Set(["lessonVideo", "videoFile", "videoUrl"]);

const LESSON_VIDEO_MIMES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/x-flv",
]);

const isLessonResourceSlotField = (fieldname) =>
  /^resource(File|Url)_\d+$/.test(fieldname || "");

/** Postman-style bracket keys e.g. resources[url], resources[0][url] */
const isBracketLessonResourceUrlField = (fieldname) =>
  fieldname === "resources[url]" || /^resources\[\d+\]\[url\]$/.test(fieldname || "");

const lessonAssetFileFilter = (req, file, cb) => {
  if (LESSON_VIDEO_FIELDS.has(file.fieldname)) {
    if (!LESSON_VIDEO_MIMES.has(file.mimetype)) {
      return cb(
        new ApiError(
          httpStatus.BAD_REQUEST,
          "Lesson video must be mp4, webm, mov, or similar."
        )
      );
    }
    return cb(null, true);
  }

  if (isLessonResourceSlotField(file.fieldname) || isBracketLessonResourceUrlField(file.fieldname)) {
    const mime = file.mimetype || "";
    const allowed =
      mime.startsWith("image/") ||
      mime.startsWith("video/") ||
      mime === "application/pdf" ||
      mime === "application/msword" ||
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mime === "application/vnd.ms-powerpoint" ||
      mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      mime.startsWith("text/");
    if (!allowed) {
      return cb(
        new ApiError(httpStatus.BAD_REQUEST, "Unsupported lesson resource file type.")
      );
    }
    return cb(null, true);
  }

  return cb(new ApiError(httpStatus.BAD_REQUEST, "Unexpected lesson upload field."));
};

const createLessonAssetUploadMiddleware = () => {
  const storage = new CloudinaryStorage({
    cloudinary: requireCloudinary(),
    params: async (req, file) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      let resource_type = "raw";
      if (LESSON_VIDEO_FIELDS.has(file.fieldname)) {
        resource_type = "video";
      } else if (file.mimetype?.startsWith("video/")) {
        resource_type = "video";
      } else if (file.mimetype?.startsWith("image/")) {
        resource_type = "image";
      }
      return {
        folder: process.env.CLOUDINARY_FOLDER || "vernita/uploads",
        resource_type,
        public_id: unique,
        overwrite: false,
      };
    },
  });

  const fields = [
    { name: "lessonVideo", maxCount: 1 },
    { name: "videoFile", maxCount: 1 },
    { name: "videoUrl", maxCount: 1 },
    { name: "resources[url]", maxCount: 1 },
  ];
  for (let i = 0; i < 10; i += 1) {
    fields.push({ name: `resourceFile_${i}`, maxCount: 1 });
    fields.push({ name: `resourceUrl_${i}`, maxCount: 1 });
    fields.push({ name: `resources[${i}][url]`, maxCount: 1 });
  }

  return multer({
    storage,
    fileFilter: lessonAssetFileFilter,
    limits: {
      fileSize: 500 * 1024 * 1024,
    },
  }).fields(fields);
};

export const uploadLessonAssets = (req, res, next) => {
  try {
    return createLessonAssetUploadMiddleware()(req, res, next);
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

