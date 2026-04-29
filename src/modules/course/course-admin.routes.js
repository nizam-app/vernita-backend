import { Router } from "express";
import { uploadCourseBanner, uploadLessonAssets } from "../../middlewares/upload.middleware.js";
import {
  completeCourseEnrollmentPayment,
  createCourse,
  createLesson,
  deleteCourse,
  deleteLesson,
  featureCourse,
  getAdminCourseById,
  getAdminCourses,
  getAdminLessonById,
  getAdminLessons,
  getCourseEnrollments,
  publishCourse,
  publishLesson,
  reorderLessons,
  updateCourse,
  updateLesson,
} from "./course-admin.controller.js";

const router = Router();

router.route("/courses").post(uploadCourseBanner, createCourse).get(getAdminCourses);
router.post("/courses/:courseId/lessons", uploadLessonAssets, createLesson);
router.get("/courses/:courseId/lessons", getAdminLessons);
router.get("/courses/:id/enrollments", getCourseEnrollments);
router.patch(
  "/courses/:courseId/enrollments/:enrollmentId/complete-payment",
  completeCourseEnrollmentPayment
);
router.patch("/courses/:id/publish", publishCourse);
router.patch("/courses/:id/feature", featureCourse);
router.route("/courses/:id").get(getAdminCourseById).patch(uploadCourseBanner, updateCourse).delete(deleteCourse);

router.patch("/lessons/reorder", reorderLessons);
router.patch("/lessons/:id/publish", publishLesson);
router.route("/lessons/:id").get(getAdminLessonById).patch(uploadLessonAssets, updateLesson).delete(deleteLesson);

export default router;
