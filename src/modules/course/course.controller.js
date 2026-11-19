import httpStatus from "../../constants/httpStatus.js";
import ApiResponse from "../../utils/api-response.js";
import { catchAsync } from "../../utils/catchAsync.js";
import * as courseService from "./course.service.js";
import {
  validateCourseIdParam,
  validateCourseListQuery,
  validateEnrollRequest,
  validateLessonComplete,
  validateLessonIdParam,
  validateLessonProgress,
  validateQuizSubmit,
} from "./course.validation.js";

export const getCourses = catchAsync(async (req, res) => {
  const query = validateCourseListQuery(req.query);
  const result = await courseService.getPublishedCourses(query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Courses fetched successfully.",
    data: result.items,
    meta: result.meta,
  });
});

export const getFeaturedCourses = catchAsync(async (req, res) => {
  const query = validateCourseListQuery(req.query);
  const result = await courseService.getFeaturedCourses(query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Featured courses fetched successfully.",
    data: result.items,
    meta: result.meta,
  });
});

export const getCourseById = catchAsync(async (req, res) => {
  validateCourseIdParam(req.params.id);
  const course = await courseService.getPublishedCourseById(req.params.id, req.user?._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Course fetched successfully.",
    data: course,
  });
});

export const enrollCourseWithPlan = catchAsync(async (req, res) => {
  validateCourseIdParam(req.params.id);
  const result = await courseService.enrollCourseWithPlan(req.params.id, req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Course enrolled using plan benefits.",
    data: result,
  });
});

export const getCoursePlanBenefitEligibility = catchAsync(async (req, res) => {
  validateCourseIdParam(req.params.id);
  const result = await courseService.getCoursePlanBenefitEligibility(
    req.params.id,
    req.user._id
  );

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Plan benefit eligibility fetched successfully.",
    data: result,
  });
});

export const enrollCourse = catchAsync(async (req, res) => {
  validateCourseIdParam(req.params.id);
  validateEnrollRequest(req.body);
  const result = await courseService.enrollCourse(req.params.id, req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: result.paymentRequired
      ? "Enrollment created. Payment is pending."
      : "Course enrolled successfully.",
    data: result,
  });
});

export const checkoutCourse = catchAsync(async (req, res) => {
  validateCourseIdParam(req.params.id);
  const result = await courseService.checkoutCourse(req.params.id, req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Course checkout session created successfully.",
    data: result,
  });
});

export const getMyCourses = catchAsync(async (req, res) => {
  const query = validateCourseListQuery(req.query);
  const result = await courseService.getMyCourses(req.user._id, query);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "My courses fetched successfully.",
    data: result.items,
    meta: result.meta,
  });
});

export const getCourseCurriculum = catchAsync(async (req, res) => {
  validateCourseIdParam(req.params.id);
  const curriculum = await courseService.getCourseCurriculum(req.params.id, req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Course curriculum fetched successfully.",
    data: curriculum,
  });
});

export const getCourseLessons = catchAsync(async (req, res) => {
  validateCourseIdParam(req.params.id);
  const lessons = await courseService.getAccessibleCourseLessons(req.params.id, req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Course lessons fetched successfully.",
    data: lessons,
  });
});

export const getLessonById = catchAsync(async (req, res) => {
  validateLessonIdParam(req.params.id);
  const lesson = await courseService.getAccessibleLessonById(req.params.id, req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Lesson fetched successfully.",
    data: lesson,
  });
});

export const updateLessonProgress = catchAsync(async (req, res) => {
  validateLessonIdParam(req.params.id);
  validateLessonProgress(req.body);
  const progress = await courseService.updateLessonProgress(
    req.params.id,
    req.user._id,
    req.body.watchedSeconds
  );

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Lesson progress updated successfully.",
    data: progress,
  });
});

export const submitQuiz = catchAsync(async (req, res) => {
  validateLessonIdParam(req.params.id);
  validateQuizSubmit(req.body);
  const result = await courseService.submitQuiz(req.params.id, req.user._id, req.body.answers);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: result.passed ? "Quiz passed." : "Quiz submitted.",
    data: result,
  });
});

export const completeLesson = catchAsync(async (req, res) => {
  validateLessonIdParam(req.params.id);
  validateLessonComplete(req.body);
  const result = await courseService.completeLesson(req.params.id, req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Lesson completed successfully.",
    data: result,
  });
});

export const getCourseProgress = catchAsync(async (req, res) => {
  validateCourseIdParam(req.params.id);
  const progress = await courseService.getCourseProgress(req.params.id, req.user._id);

  return ApiResponse.success(res, {
    statusCode: httpStatus.OK,
    message: "Course progress fetched successfully.",
    data: progress,
  });
});
