import { Router } from "express";
import { protect } from "../../middlewares/auth.js";
import { getProfile } from "./user.controller.js";

const router = Router();

router.get("/me", protect, getProfile);

export default router;
