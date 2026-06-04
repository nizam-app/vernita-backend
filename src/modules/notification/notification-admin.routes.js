import { Router } from "express";
import {
  adminSendCourseAnnouncement,
  adminSendSystemNotification,
} from "./notification-admin.controller.js";

const router = Router();

router.post("/system", adminSendSystemNotification);
router.post("/course-announcement", adminSendCourseAnnouncement);

export default router;

