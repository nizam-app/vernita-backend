
import { Router } from "express";
import adminRouter from "../modules/admin/admin.router.js";
import userRouter from "../modules/user/user.router.js";
import authRouter from "../modules/auth/auth.router.js";
import projectRouter from "../modules/project/project.routes.js";
import subscriptionRouter from "../modules/subscription/subscription.routes.js";
import webinarRouter from "../modules/webinar/webinar.routes.js";

const router = Router();

router.get("/health", (req, res) => {
  res.send("API is healthy");
});

router.use("/auth", authRouter);
router.use("/admin", adminRouter);
router.use("/projects", projectRouter);
router.use("/subscriptions", subscriptionRouter);
router.use("/webinars", webinarRouter);
router.use("/users", userRouter);

export default router;
