import fs from "fs";
import path from "path";
import httpStatus from "../constants/httpStatus.js";
import ApiError from "../utils/api-error.js";
import { requireCloudinary } from "../config/cloudinary.js";

const VIDEO_EXTENSION_BY_MIME = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/x-msvideo": ".avi",
  "video/x-matroska": ".mkv",
  "video/x-flv": ".flv",
};

export const lessonVideoStorageDir = () => {
  const configured = process.env.VIDEO_STORAGE_DIR?.trim();
  return configured || path.resolve(process.cwd(), "storage", "videos");
};

const moveFile = async (from, to) => {
  try {
    await fs.promises.rename(from, to);
  } catch (err) {
    if (err?.code !== "EXDEV") throw err;
    await fs.promises.copyFile(from, to);
    await fs.promises.unlink(from);
  }
};

/** Saves a lesson video on the API server and returns the public URL plus stored file name. */
export const storeLessonVideo = async (file, publicBaseUrl) => {
  const base = String(publicBaseUrl || "").replace(/\/$/, "");
  if (!base) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Video public URL is not configured.");
  }
  const dir = lessonVideoStorageDir();
  await fs.promises.mkdir(dir, { recursive: true });
  const ext = VIDEO_EXTENSION_BY_MIME[file?.mimetype] || ".mp4";
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  await moveFile(file.path, path.join(dir, filename));
  return { url: `${base}/videos/${filename}`, filename };
};

const deleteLocalLessonVideo = async (publicId) => {
  const filename = path.basename(String(publicId || ""));
  if (!filename || filename !== publicId || filename === "." || filename === "..") {
    return { result: "skipped" };
  }
  const dir = path.resolve(lessonVideoStorageDir());
  const target = path.resolve(dir, filename);
  const relative = path.relative(dir, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return { result: "skipped" };
  }
  try {
    await fs.promises.unlink(target);
  } catch (err) {
    if (err?.code !== "ENOENT") {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to delete the lesson video.");
    }
  }
  return { result: "ok" };
};

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

const CLOUDINARY_CHUNK_SIZE = 20 * 1024 * 1024;

const lessonResourceType = (file) => {
  const field = file?.fieldname || "";
  if (field === "lessonVideo" || field === "videoFile" || field === "videoUrl") return "video";
  if (file?.mimetype?.startsWith("video/")) return "video";
  if (file?.mimetype?.startsWith("image/")) return "image";
  return "raw";
};

/** Cloudinary rejects a single request over 100MB with HTTP 413. Chunked upload avoids that. */
export const uploadLargeFile = (filePath, { resourceType, publicId }) => {
  const cloudinary = requireCloudinary();
  const folder = process.env.CLOUDINARY_FOLDER || "vernita/uploads";

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_large(
      filePath,
      {
        folder,
        resource_type: resourceType,
        public_id: publicId,
        chunk_size: CLOUDINARY_CHUNK_SIZE,
        timeout: 10 * 60 * 1000,
        disable_promises: true,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
  });
};

export const uploadLessonFile = async (file) => {
  const publicId = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const result = await uploadLargeFile(file.path, {
    resourceType: lessonResourceType(file),
    publicId,
  });

  if (!result?.secure_url || !result?.public_id) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Upload failed.");
  }

  return result;
};

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

/** `local` removes a VPS file. Any other type is a Cloudinary asset. */
export const deleteStoredAsset = async (publicId, resourceType = "image") => {
  if (!publicId) return { result: "skipped" };
  if (resourceType === "local") return deleteLocalLessonVideo(publicId);
  return deleteCloudinaryAsset(publicId, resourceType);
};

