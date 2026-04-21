import { Router } from "express";
import { protect } from "../../middlewares/auth.js";
import {
  completeLesson,
  checkoutCourse,
  enrollCourse,
  getCourseById,
  getCourseLessons,
  getCourseProgress,
  getCourses,
  getFeaturedCourses,
  getMyCourses,
} from "./course.controller.js";

const router = Router();

router.get("/", getCourses);
router.get("/featured", getFeaturedCourses);
router.get("/my", protect, getMyCourses);
router.post("/:id/enroll", protect, enrollCourse);
router.post("/:id/checkout", protect, checkoutCourse);
router.get("/:id/lessons", protect, getCourseLessons);
router.get("/:id/progress", protect, getCourseProgress);
router.get("/:id", getCourseById);

export default router;
