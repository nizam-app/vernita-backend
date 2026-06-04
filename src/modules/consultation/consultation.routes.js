import { Router } from "express";
import { consultationFormLimiter } from "../../middlewares/rateLimiter.js";
import { submitConsultation } from "./consultation.controller.js";

const router = Router();

/**
 * Public — Website #2 "Schedule a Free Consultation" form.
 * POST /api/v1/consultations
 */
router.post("/", consultationFormLimiter, submitConsultation);

export default router;
