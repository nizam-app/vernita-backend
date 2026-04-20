import { Router } from "express";
import {
  completeRegistrationPayment,
  createWebinar,
  getAdminWebinars,
  getAdminWebinarById,
  updateWebinar,
  deleteWebinar,
  publishWebinar,
  updateWebinarStatus,
  getWebinarRegistrations,
} from "./webinar-admin.controller.js";

const router = Router();

router.route("/").post(createWebinar).get(getAdminWebinars);
router.get("/:id/registrations", getWebinarRegistrations);
router.patch(
  "/:id/registrations/:registrationId/complete-payment",
  completeRegistrationPayment
);
router.patch("/:id/publish", publishWebinar);
router.patch("/:id/status", updateWebinarStatus);
router.route("/:id").get(getAdminWebinarById).patch(updateWebinar).delete(deleteWebinar);

export default router;
