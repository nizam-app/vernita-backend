import httpStatus from "../../constants/httpStatus.js";
import ApiResponse from "../../utils/api-response.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { getUploadedAssetInfo, getUploadedImageInfo } from "../../services/upload.service.js";
import * as courseService from "./course.service.js";
import {
  validateCourseIdParam,
  validateCourseListQuery,
  validateCreateCourse,
  validateCreateLesson,
  validateEnrollmentIdParam,
  validateLessonIdParam,
  validatePaymentCompletion,
  validateReorderLessons,
  validateToggleBody,
  validateUpdateCourse,
  validateUpdateLesson,
} from "./course.validation.js";

const parseJsonIfString = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const normalizeMultipartCourseBody = (body = {}) => {
  const next = { ...body };

  const parseMaybeNumber = (value) => {
    if (value === undefined || value === null) return value;
    if (typeof value === "number") return value;
    if (typeof value !== "string") return value;
    const cleaned = value.trim().replace(/,$/, "");
    if (cleaned === "") return value;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : value;
  };

  const parseMaybeBoolean = (value) => {
    if (value === undefined || value === null) return value;
    if (typeof value === "boolean") return value;
    if (typeof value !== "string") return value;
    const cleaned = value.trim().replace(/,$/, "").toLowerCase();
    if (cleaned === "true") return true;
    if (cleaned === "false") return false;
    return value;
  };

  if (next.tags !== undefined) next.tags = parseJsonIfString(next.tags);

  if (next.durationInWeeks !== undefined) next.durationInWeeks = parseMaybeNumber(next.durationInWeeks);
  if (next.price !== undefined) next.price = parseMaybeNumber(next.price);
  if (next.certificateEnabled !== undefined) {
    next.certificateEnabled = parseMaybeBoolean(next.certificateEnabled);
  }
  if (next.isFeatured !== undefined) next.isFeatured = parseMaybeBoolean(next.isFeatured);
  if (next.isPublished !== undefined) next.isPublished = parseMaybeBoolean(next.isPublished);

  return next;
};

const applyBannerUploadToBody = (req) => {
  delete req.body.bannerImagePublicId;
  const bannerFile = req.files?.bannerImage?.[0] || req.files?.bannerImageUrl?.[0] || null;
  if (!bannerFile) return;

  const uploaded = getUploadedImageInfo(bannerFile);
  req.body.bannerImage = uploaded.url;
  req.body.bannerImagePublicId = uploaded.public_id;
};

const normalizeMultipartLessonBody = (body = {}) => {
  const next = { ...body };

  const parseMaybeNumber = (value) => {
    if (value === undefined || value === null) return value;
    if (typeof value === "number") return value;
    if (typeof value !== "string") return value;
    const cleaned = value.trim().replace(/,$/, "");
    if (cleaned === "") return value;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : value;
  };

  const parseMaybeBoolean = (value) => {
    if (value === undefined || value === null) return value;
    if (typeof value === "boolean") return value;
    if (typeof value !== "string") return value;
    const cleaned = value.trim().replace(/,$/, "").toLowerCase();
    if (cleaned === "true") return true;
    if (cleaned === "false") return false;
    return value;
  };

  /**
   * multipart parsers often turn resources[k] fields into:
   * - a nested object `resources: { title, type, url }`, or
   * - flat keys only — both must become `resources: [{ title, type, url }]`.
   */
  let explicit = next.resources;
  if (explicit !== undefined && typeof explicit === "string") {
    explicit = parseJsonIfString(explicit);
  }

  if (
    explicit !== undefined &&
    explicit !== null &&
    typeof explicit !== "string"
  ) {
    if (Array.isArray(explicit)) {
      next.resources = explicit;
    } else if (typeof explicit === "object") {
      const o = explicit;
      next.resources = [
        {
          title: o.title ?? "",
          type: o.type ?? "",
          url: o.url ?? "",
        },
      ];
    }
  } else {
    if (typeof explicit === "string") delete next.resources;

    const indexed = [];
    for (let i = 0; i < 10; i += 1) {
      const t = next[`resources[${i}][title]`];
      const ty = next[`resources[${i}][type]`];
      const u = next[`resources[${i}][url]`];
      if (t === undefined && ty === undefined && u === undefined) continue;
      indexed.push({
        title: t ?? "",
        type: ty ?? "",
        url: typeof u === "string" ? u : "",
      });
      delete next[`resources[${i}][title]`];
      delete next[`resources[${i}][type]`];
      delete next[`resources[${i}][url]`];
    }
    if (indexed.length > 0) {
      next.resources = indexed;
    } else if (
      next["resources[title]"] !== undefined ||
      next["resources[type]"] !== undefined ||
      next["resources[url]"] !== undefined
    ) {
      next.resources = [
        {
          title: next["resources[title]"] ?? "",
          type: next["resources[type]"] ?? "",
          url:
            typeof next["resources[url]"] === "string" ? next["resources[url]"] : "",
        },
      ];
      delete next["resources[title]"];
      delete next["resources[type]"];
      delete next["resources[url]"];
    }
  }

  if (next.videoDurationSeconds !== undefined) {
    next.videoDurationSeconds = parseMaybeNumber(next.videoDurationSeconds);
  }
  if (next.sortOrder !== undefined) next.sortOrder = parseMaybeNumber(next.sortOrder);
  if (next.isPreview !== undefined) next.isPreview = parseMaybeBoolean(next.isPreview);
  if (next.isPublished !== undefined) next.isPublished = parseMaybeBoolean(next.isPublished);

  return next;
};

const stripLessonUploadSpoofIds = (body) => {
  delete body.videoPublicId;
  delete body.videoAssetResourceType;
  if (!Array.isArray(body.resources)) return;
  body.resources = body.resources.map((r) => {
    if (!r || typeof r !== "object") return r;
    const next = { ...r };
    delete next.assetPublicId;
    delete next.assetResourceType;
    return next;
  });
};

const inferLessonAssetResourceType = (file) => {
  const fn = file.fieldname || "";
  if (fn === "lessonVideo" || fn === "videoFile" || fn === "videoUrl") return "video";
  if (file.mimetype?.startsWith("video/")) return "video";
  if (file.mimetype?.startsWith("image/")) return "image";
  return "raw";
};

const applyLessonUploadsToBody = (req) => {
  delete req.body.videoPublicId;
  delete req.body.videoAssetResourceType;

  const mergeUploadedIntoResource = (index, resourceFile) => {
    const uploaded = getUploadedAssetInfo(resourceFile);
    if (!Array.isArray(req.body.resources)) req.body.resources = [];
    while (req.body.resources.length <= index) {
      req.body.resources.push({ title: "", type: "", url: "" });
    }
    req.body.resources[index] = {
      ...(typeof req.body.resources[index] === "object" && req.body.resources[index] !== null
        ? req.body.resources[index]
        : {}),
      url: uploaded.url,
      assetPublicId: uploaded.public_id,
      assetResourceType: inferLessonAssetResourceType(resourceFile),
    };
  };

  const videoFile =
    req.files?.lessonVideo?.[0] || req.files?.videoFile?.[0] || req.files?.videoUrl?.[0] || null;
  if (videoFile) {
    const uploaded = getUploadedAssetInfo(videoFile);
    req.body.videoUrl = uploaded.url;
    req.body.videoPublicId = uploaded.public_id;
    req.body.videoAssetResourceType = inferLessonAssetResourceType(videoFile);
  }

  if (Array.isArray(req.body.resources)) {
    for (let i = 0; i < req.body.resources.length; i += 1) {
      const slotFile =
        req.files?.[`resourceFile_${i}`]?.[0] || req.files?.[`resourceUrl_${i}`]?.[0] || null;
      if (!slotFile) continue;
      mergeUploadedIntoResource(i, slotFile);
    }
  }

  const bracketSingle = req.files?.["resources[url]"]?.[0];
  if (bracketSingle) mergeUploadedIntoResource(0, bracketSingle);

  for (let i = 0; i < 10; i += 1) {
    const bf = req.files?.[`resources[${i}][url]`]?.[0];
    if (!bf) continue;
    mergeUploadedIntoResource(i, bf);
  }

  if (Array.isArray(req.body.resources) && req.body.resources.length === 0) {
    delete req.body.resources;
  }
};

const omitLessonCloudinaryIdsForValidation = (body) => {
  const next = { ...body };
  delete next.videoPublicId;
  delete next.videoAssetResourceType;
  if (Array.isArray(next.resources)) {
    next.resources = next.resources.map((r) => {
      if (!r || typeof r !== "object") return r;
      const { assetPublicId: _ap, assetResourceType: _ar, ...rest } = r;
      return rest;
    });
  }
  return next;
};

export const createCourse = catchAsync(async (req, res) => {
  req.body = normalizeMultipartCourseBody(req.body);
  delete req.body.bannerImagePublicId;
  applyBannerUploadToBody(req);
  validateCreateCourse(req.body);
  const course = await courseService.createCourse(req.body, req.user?._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.CREATED,
    message: "Course created successfully.",
    data: course,
  });
});

export const getAdminCourses = catchAsync(async (req, res) => {
  const query = validateCourseListQuery(req.query, { admin: true });
  const result = await courseService.getAdminCourses(query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Courses fetched successfully.",
    data: result.items,
    meta: result.meta,
  });
});

export const getAdminCourseById = catchAsync(async (req, res) => {
  validateCourseIdParam(req.params.id);
  const course = await courseService.getAdminCourseById(req.params.id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Course fetched successfully.",
    data: course,
  });
});

export const getCourseEnrollments = catchAsync(async (req, res) => {
  validateCourseIdParam(req.params.id);
  const enrollments = await courseService.getCourseEnrollments(req.params.id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Course enrollments fetched successfully.",
    data: enrollments,
  });
});

export const updateCourse = catchAsync(async (req, res) => {
  validateCourseIdParam(req.params.id);
  req.body = normalizeMultipartCourseBody(req.body);
  delete req.body.bannerImagePublicId;
  applyBannerUploadToBody(req);
  validateUpdateCourse(req.body);
  const course = await courseService.updateCourseWithFiles({
    courseId: req.params.id,
    payload: req.body,
    files: req.files,
    adminUserId: req.user?._id,
  });

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Course updated successfully.",
    data: course,
  });
});

export const deleteCourse = catchAsync(async (req, res) => {
  validateCourseIdParam(req.params.id);
  const course = await courseService.deleteCourse(req.params.id, req.user?._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Course deleted successfully.",
    data: course,
  });
});

export const publishCourse = catchAsync(async (req, res) => {
  validateCourseIdParam(req.params.id);
  validateToggleBody(req.body, "isPublished");
  const course = await courseService.publishCourse(
    req.params.id,
    req.body.isPublished,
    req.user?._id
  );

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: `Course ${req.body.isPublished ? "published" : "unpublished"} successfully.`,
    data: course,
  });
});

export const featureCourse = catchAsync(async (req, res) => {
  validateCourseIdParam(req.params.id);
  validateToggleBody(req.body, "isFeatured");
  const course = await courseService.featureCourse(
    req.params.id,
    req.body.isFeatured,
    req.user?._id
  );

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: `Course ${req.body.isFeatured ? "featured" : "unfeatured"} successfully.`,
    data: course,
  });
});

export const createLesson = catchAsync(async (req, res) => {
  validateCourseIdParam(req.params.courseId);
  req.body = normalizeMultipartLessonBody(req.body);
  stripLessonUploadSpoofIds(req.body);
  applyLessonUploadsToBody(req);
  validateCreateLesson(req.body);
  const lesson = await courseService.createLesson(req.params.courseId, req.body);

  return ApiResponse.success(res, {
    statusCode: httpStatus.CREATED,
    message: "Lesson created successfully.",
    data: lesson,
  });
});

export const getAdminLessons = catchAsync(async (req, res) => {
  validateCourseIdParam(req.params.courseId);
  const lessons = await courseService.getAdminLessons(req.params.courseId);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Lessons fetched successfully.",
    data: lessons,
  });
});

export const getAdminLessonById = catchAsync(async (req, res) => {
  validateLessonIdParam(req.params.id);
  const lesson = await courseService.getAdminLessonById(req.params.id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Lesson fetched successfully.",
    data: lesson,
  });
});

export const updateLesson = catchAsync(async (req, res) => {
  validateLessonIdParam(req.params.id);
  req.body = normalizeMultipartLessonBody(req.body);
  stripLessonUploadSpoofIds(req.body);
  applyLessonUploadsToBody(req);
  validateUpdateLesson(omitLessonCloudinaryIdsForValidation(req.body));
  const lesson = await courseService.updateLessonWithFiles(req.params.id, req.body, req.files);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Lesson updated successfully.",
    data: lesson,
  });
});

export const deleteLesson = catchAsync(async (req, res) => {
  validateLessonIdParam(req.params.id);
  const lesson = await courseService.deleteLesson(req.params.id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Lesson deleted successfully.",
    data: lesson,
  });
});

export const publishLesson = catchAsync(async (req, res) => {
  validateLessonIdParam(req.params.id);
  validateToggleBody(req.body, "isPublished");
  const lesson = await courseService.publishLesson(req.params.id, req.body.isPublished);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: `Lesson ${req.body.isPublished ? "published" : "unpublished"} successfully.`,
    data: lesson,
  });
});

export const reorderLessons = catchAsync(async (req, res) => {
  validateReorderLessons(req.body);
  const lessons = await courseService.reorderLessons(req.body.lessons);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Lessons reordered successfully.",
    data: lessons,
  });
});

export const completeCourseEnrollmentPayment = catchAsync(async (req, res) => {
  validateCourseIdParam(req.params.courseId);
  validateEnrollmentIdParam(req.params.enrollmentId);
  const paymentPayload = validatePaymentCompletion(req.body);
  const result = await courseService.completeCourseEnrollmentPayment(
    req.params.courseId,
    req.params.enrollmentId,
    paymentPayload
  );

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Course enrollment payment marked as completed.",
    data: result,
  });
});
