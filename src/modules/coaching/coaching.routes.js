import { Router } from "express";
import { protect } from "../../middlewares/auth.js";
import {
  getCoachingPackageDetails,
  getFeaturedCoachingPackages,
  getMyCoaching,
  getMyCoachingDetail,
  getMySessions,
  getPublishedCoachingPackages,
  purchaseCoachingPackage,
  scheduleMySession,
} from "./coaching.controller.js";

const router = Router();

router.get("/packages", getPublishedCoachingPackages);
router.get("/packages/featured", getFeaturedCoachingPackages);
router.get("/packages/:id", getCoachingPackageDetails);
router.post("/packages/:id/purchase", protect, purchaseCoachingPackage);

router.get("/my", protect, getMyCoaching);
router.get("/my/:purchaseId", protect, getMyCoachingDetail);
router.post("/my/:purchaseId/schedule", protect, scheduleMySession);
router.get("/my/:purchaseId/sessions", protect, getMySessions);

export default router;

