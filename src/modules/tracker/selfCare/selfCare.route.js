import { Router } from "express";
import { protect } from "../../../middlewares/auth.js";
import {
  deleteEntry,
  getEntryById,
  getHistory,
  getSummaryStats,
  getTodayEntry,
  getWeeklyStats,
  patchTodayEntry,
  upsertTodayEntry,
} from "./selfCare.controller.js";

const router = Router();

router.use(protect);

router.get("/today", getTodayEntry);
router.post("/today", upsertTodayEntry);
router.patch("/today", patchTodayEntry);
router.get("/history", getHistory);
router.get("/stats/weekly", getWeeklyStats);
router.get("/stats/summary", getSummaryStats);
router.route("/:id").get(getEntryById).delete(deleteEntry);

export default router;
