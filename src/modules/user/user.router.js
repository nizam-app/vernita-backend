import { Router } from "express";
import { protect } from "../../middlewares/auth.js";
import { deleteAccount, getProfile, getProfileDashboard } from "./user.controller.js";

const router = Router();

router.get("/me/dashboard", protect, getProfileDashboard);
router.get("/me", protect, getProfile);
router.delete("/me", protect, deleteAccount);

export default router;
