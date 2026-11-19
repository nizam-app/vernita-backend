import { Router } from "express";
import { protect } from "../../middlewares/auth.js";
import {
  completeLesson,
  getLessonById,
  submitQuiz,
  updateLessonProgress,
} from "./course.controller.js";

const router = Router();

router.post("/:id/quiz/submit", protect, submitQuiz);
router.get("/:id", protect, getLessonById);
router.patch("/:id/progress", protect, updateLessonProgress);
router.patch("/:id/complete", protect, completeLesson);

export default router;
