import { Router } from "express";
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

router.route("/courses").post(createCourse).get(getAdminCourses);
router.post("/courses/:courseId/lessons", createLesson);
router.get("/courses/:courseId/lessons", getAdminLessons);
router.get("/courses/:id/enrollments", getCourseEnrollments);
router.patch(
  "/courses/:courseId/enrollments/:enrollmentId/complete-payment",
  completeCourseEnrollmentPayment
);
router.patch("/courses/:id/publish", publishCourse);
router.patch("/courses/:id/feature", featureCourse);
router.route("/courses/:id").get(getAdminCourseById).patch(updateCourse).delete(deleteCourse);

router.patch("/lessons/reorder", reorderLessons);
router.patch("/lessons/:id/publish", publishLesson);
router.route("/lessons/:id").get(getAdminLessonById).patch(updateLesson).delete(deleteLesson);

export default router;
