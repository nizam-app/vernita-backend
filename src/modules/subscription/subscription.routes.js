import { Router } from "express";
import { protect } from "../../middlewares/auth.js";
import {
  getPlans,
  comparePlans,
  getCurrentSubscription,
  checkoutSubscription,
  cancelSubscription,
  changePlan,
  getSubscriptionHistory,
  getCheckInOverview,
  scheduleCheckIn,
  rescheduleCheckIn,
  cancelCheckIn,
} from "./subscription.controller.js";

const router = Router();

router.get("/plans", getPlans);
router.get("/plans/compare", comparePlans);
router.get("/current", protect, getCurrentSubscription);
router.post("/checkout", protect, checkoutSubscription);
router.patch("/cancel", protect, cancelSubscription);
router.patch("/change-plan", protect, changePlan);
router.get("/history", protect, getSubscriptionHistory);
router.get("/check-in", protect, getCheckInOverview);
router.post("/check-in/schedule", protect, scheduleCheckIn);
router.patch("/check-in/:sessionId/reschedule", protect, rescheduleCheckIn);
router.patch("/check-in/:sessionId/cancel", protect, cancelCheckIn);

export default router;
