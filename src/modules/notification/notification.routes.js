import { Router } from "express";
import { protect } from "../../middlewares/auth.js";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notification.controller.js";

const router = Router();

router.get("/", protect, getMyNotifications);
router.post("/read-all", protect, markAllNotificationsRead);
router.post("/:id/read", protect, markNotificationRead);

export default router;

