import { Router } from "express";
import { protect } from "../../middlewares/auth.js";
import {
  addMilestone,
  archiveGoal,
  createGoal,
  deleteGoal,
  deleteMilestone,
  getGoalById,
  getGoals,
  recalculateProgress,
  unarchiveGoal,
  updateGoal,
  updateMilestone,
} from "./goal.controller.js";

const router = Router();

router.use(protect);

router.route("/").post(createGoal).get(getGoals);
router.post("/:id/milestones", addMilestone);
router.patch("/:id/milestones/:milestoneId", updateMilestone);
router.delete("/:id/milestones/:milestoneId", deleteMilestone);
router.patch("/:id/recalculate-progress", recalculateProgress);
router.patch("/:id/archive", archiveGoal);
router.patch("/:id/unarchive", unarchiveGoal);
router.route("/:id").get(getGoalById).patch(updateGoal).delete(deleteGoal);

export default router;
