import { Router } from "express";
import { protect } from "../../../middlewares/auth.js";
import {
  createFitnessEntry,
  deleteFitnessEntry,
  getFitnessEntries,
  getFitnessEntryById,
  getRecentActivity,
  getWeeklyStats,
  updateFitnessEntry,
} from "./fitness.controller.js";

const router = Router();

router.use(protect);

router.route("/").post(createFitnessEntry).get(getFitnessEntries);
router.get("/recent/activity", getRecentActivity);
router.get("/stats/weekly", getWeeklyStats);
router.route("/:id").get(getFitnessEntryById).patch(updateFitnessEntry).delete(deleteFitnessEntry);

export default router;
