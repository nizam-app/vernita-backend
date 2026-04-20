import { Router } from "express";
import { protect } from "../../middlewares/auth.js";
import { authorizeAdmin } from "../../middlewares/admin.js";
import planRoutes from "../plan/plan.router.js";
import subscriptionAdminRoutes from "../subscription/subscription-admin.routes.js";
import webinarAdminRoutes from "../webinar/webinar-admin.routes.js";
import {
  getUsers,
  getUserById,
  updateUserById,
  deleteUserById,
} from "./admin.controller.js";

const router = Router();

router.use(protect, authorizeAdmin);
router.use("/plans", planRoutes);
router.use("/webinars", webinarAdminRoutes);
router.use("/", subscriptionAdminRoutes);

router.get("/users", getUsers);
router.get("/users/:userId", getUserById);
router.patch("/users/:userId", updateUserById);
router.delete("/users/:userId", deleteUserById);

export default router;
