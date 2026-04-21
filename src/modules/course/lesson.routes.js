import { Router } from "express";
import { protect } from "../../middlewares/auth.js";
import {
  completeLesson,
  getLessonById,
  updateLessonProgress,
} from "./course.controller.js";

const router = Router();

router.get("/:id", protect, getLessonById);
router.patch("/:id/progress", protect, updateLessonProgress);
router.patch("/:id/complete", protect, completeLesson);

export default router;
