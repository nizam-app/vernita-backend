import { Router } from "express";
import { protect } from "../../middlewares/auth.js";
import {
  getWebinars,
  getWebinarCategories,
  getWebinarById,
  registerForWebinar,
  checkoutWebinar,
  getMyWebinars,
  joinWebinar,
} from "./webinar.controller.js";

const router = Router();

router.get("/", getWebinars);
router.get("/categories", getWebinarCategories);
router.get("/my", protect, getMyWebinars);
router.post("/:id/register", protect, registerForWebinar);
router.post("/:id/checkout", protect, checkoutWebinar);
router.get("/:id/join", protect, joinWebinar);
router.get("/:id", getWebinarById);

export default router;
