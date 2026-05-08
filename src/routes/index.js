
import { Router } from "express";
import adminRouter from "../modules/admin/admin.router.js";
import userRouter from "../modules/user/user.router.js";
import authRouter from "../modules/auth/auth.router.js";
import courseRouter from "../modules/course/course.routes.js";
import financeRouter from "../modules/tracker/finance/finance.route.js";
import fitnessRouter from "../modules/tracker/fitness/fitness.route.js";
import goalRouter from "../modules/goal/goal.routes.js";
import lessonRouter from "../modules/course/lesson.routes.js";
import projectRouter from "../modules/project/project.routes.js";
import reflectionRouter from "../modules/tracker/reflections/reflection.route.js";
import selfCareRouter from "../modules/tracker/selfCare/selfCare.route.js";
import subscriptionRouter from "../modules/subscription/subscription.routes.js";
import taskRouter from "../modules/task/task.routes.js";
import webinarRouter from "../modules/webinar/webinar.routes.js";
import coachingRouter from "../modules/coaching/coaching.routes.js";
import uploadRouter from "./upload.route.js";
import { protect } from "../middlewares/auth.js";
import inquiryRouter from "../modules/inquiry/inquiry.routes.js";
import notificationRouter from "../modules/notification/notification.routes.js";

const router = Router();

router.get("/health", (req, res) => {
  res.send("API is healthy");
});

router.use("/auth", authRouter);
router.use("/admin", adminRouter);
router.use("/courses", courseRouter);
router.use("/finance", financeRouter);
router.use("/fitness", fitnessRouter);
router.use("/goals", goalRouter);
router.use("/lessons", lessonRouter);
router.use("/projects", projectRouter);
router.use("/reflections", reflectionRouter);
router.use("/self-care", selfCareRouter);
router.use("/subscriptions", subscriptionRouter);
router.use("/tasks", protect, taskRouter);
router.use("/webinars", webinarRouter);
router.use("/users", userRouter);
router.use("/coaching", coachingRouter);
router.use("/upload", uploadRouter);
router.use("/inquiries", inquiryRouter);
router.use("/notifications", notificationRouter);

export default router;
