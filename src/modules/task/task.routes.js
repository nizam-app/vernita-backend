import { Router } from "express";
import {
  completeTask,
  createTask,
  deleteTask,
  getSummaryCounts,
  getTaskById,
  getTasks,
  updateTask,
} from "./task.controller.js";

const router = Router();

router.route("/").post(createTask).get(getTasks);
router.get("/summary/counts", getSummaryCounts);
router.patch("/:id/complete", completeTask);
router.route("/:id").get(getTaskById).patch(updateTask).delete(deleteTask);

export default router;
