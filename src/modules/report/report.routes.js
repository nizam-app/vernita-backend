import { Router } from "express";
import {
  coachingSales,
  coursePerformance,
  revenueReport,
  totalUserGrowth,
  webinarPerformance,
} from "./report.controller.js";

const router = Router();

router.get("/users-growth", totalUserGrowth);
router.get("/revenue", revenueReport);
router.get("/courses", coursePerformance);
router.get("/webinars", webinarPerformance);
router.get("/coaching-sales", coachingSales);

export default router;

