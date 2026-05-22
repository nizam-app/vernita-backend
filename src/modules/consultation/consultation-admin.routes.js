import { Router } from "express";
import { adminGetConsultationById, adminListConsultations } from "./consultation-admin.controller.js";

const router = Router();

router.get("/", adminListConsultations);
router.get("/:id", adminGetConsultationById);

export default router;
