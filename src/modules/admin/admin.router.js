import { Router } from "express";
import { protect } from "../../middlewares/auth.js";
import { authorizeAdmin } from "../../middlewares/admin.js";
import courseAdminRoutes from "../course/course-admin.routes.js";
import coachingAdminRoutes from "../coaching/coaching-admin.routes.js";
import orderAdminRoutes from "../order/order-admin.routes.js";
import planRoutes from "../plan/plan.router.js";
import subscriptionAdminRoutes from "../subscription/subscription-admin.routes.js";
import webinarAdminRoutes from "../webinar/webinar-admin.routes.js";
import inquiryAdminRoutes from "../inquiry/inquiry-admin.routes.js";
import notificationAdminRoutes from "../notification/notification-admin.routes.js";
import reportRoutes from "../report/report.routes.js";
import consultationAdminRoutes from "../consultation/consultation-admin.routes.js";
import {
  getUsers,
  getUserById,
  updateUserById,
  deleteUserById,
} from "./admin.controller.js";

const router = Router();

router.use(protect, authorizeAdmin);
router.use("/", courseAdminRoutes);
router.use("/coaching", coachingAdminRoutes);
router.use("/plans", planRoutes);
router.use("/webinars", webinarAdminRoutes);
router.use("/", subscriptionAdminRoutes);
router.use("/orders", orderAdminRoutes);
router.use("/inquiries", inquiryAdminRoutes);
router.use("/consultations", consultationAdminRoutes);
router.use("/notifications", notificationAdminRoutes);
router.use("/reports", reportRoutes);

router.get("/users", getUsers);
router.get("/users/:userId", getUserById);
router.patch("/users/:userId", updateUserById);
router.delete("/users/:userId", deleteUserById);

export default router;
