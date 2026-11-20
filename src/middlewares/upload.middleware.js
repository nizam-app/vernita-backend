import fs from "fs";
import os from "os";
import path from "path";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { requireCloudinary } from "../config/cloudinary.js";
import httpStatus from "../constants/httpStatus.js";
import ApiError from "../utils/api-error.js";
import { storeLessonVideo, deleteStoredAsset, uploadLessonFile } from "../services/upload.service.js";

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

const LESSON_VIDEO_MAX_BYTES = 250 * 1024 * 1024;

const lessonTempDir = path.join(os.tmpdir(), "vernita-lesson-uploads");

const lessonDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(lessonTempDir, { recursive: true });
    cb(null, lessonTempDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}`);
  },
});

const createLessonAssetUploadMiddleware = () => {
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
    storage: lessonDiskStorage,
    fileFilter: lessonAssetFileFilter,
    limits: {
      fileSize: LESSON_VIDEO_MAX_BYTES,
    },
  }).fields(fields);
};

const runMiddleware = (middleware, req, res) =>
  new Promise((resolve, reject) => {
    middleware(req, res, (err) => (err ? reject(err) : resolve()));
  });

const mapLessonUploadError = (err) => {
  if (err instanceof ApiError) return err;
  const message = err?.message || "Upload failed.";
  if (/invalid signature|api_secret mismatch/i.test(message)) {
    return new ApiError(
      httpStatus.BAD_REQUEST,
      "Cloudinary rejected the upload. The API secret in the backend .env does not match this Cloudinary account."
    );
  }
  if (message.includes("413") || /file size too large/i.test(message)) {
    return new ApiError(
      httpStatus.BAD_REQUEST,
      "This video is too large for the current Cloudinary plan. Compress it or raise the plan's video size limit."
    );
  }
  if (message.startsWith("Missing env:")) {
    return new ApiError(httpStatus.BAD_REQUEST, "Cloudinary environment variables are missing.");
  }
  if (err?.code === "LIMIT_FILE_SIZE") {
    return new ApiError(httpStatus.BAD_REQUEST, "Video must be 250MB or smaller.");
  }
  return new ApiError(httpStatus.INTERNAL_SERVER_ERROR, message);
};

const removeTempFiles = async (files) => {
  const groups = Object.values(files || {});
  await Promise.all(
    groups.flat().map((file) => {
      const tempPath = file?.tempPath;
      return tempPath ? fs.promises.unlink(tempPath).catch(() => {}) : null;
    })
  );
};

const videoPublicBaseUrl = (req) => {
  const configured = process.env.VIDEO_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
};

export const uploadLessonAssets = async (req, res, next) => {
  const storedLocalNames = [];
  try {
    await runMiddleware(createLessonAssetUploadMiddleware(), req, res);
    const groups = Object.values(req.files || {});
    for (const group of groups) {
      for (const file of group) {
        file.tempPath = file.path;
        if (LESSON_VIDEO_FIELDS.has(file.fieldname)) {
          const stored = await storeLessonVideo(file, videoPublicBaseUrl(req));
          file.tempPath = "";
          file.path = stored.url;
          file.filename = stored.filename;
          file.public_id = stored.filename;
          file.storedLocally = true;
          storedLocalNames.push(stored.filename);
          continue;
        }
        const uploaded = await uploadLessonFile(file);
        await fs.promises.unlink(file.tempPath).catch(() => {});
        file.tempPath = "";
        file.path = uploaded.secure_url;
        file.filename = uploaded.public_id;
        file.public_id = uploaded.public_id;
      }
    }
    return next();
  } catch (err) {
    await removeTempFiles(req.files);
    await Promise.all(storedLocalNames.map((name) => deleteStoredAsset(name, "local").catch(() => {})));
    return next(mapLessonUploadError(err));
  }
};

