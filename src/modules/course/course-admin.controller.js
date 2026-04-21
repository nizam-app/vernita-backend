import httpStatus from "../../constants/httpStatus.js";
import ApiResponse from "../../utils/api-response.js";
import { catchAsync } from "../../utils/catchAsync.js";
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

export const createCourse = catchAsync(async (req, res) => {
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
  validateUpdateCourse(req.body);
  const course = await courseService.updateCourse(req.params.id, req.body, req.user?._id);

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
  validateUpdateLesson(req.body);
  const lesson = await courseService.updateLesson(req.params.id, req.body);

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
