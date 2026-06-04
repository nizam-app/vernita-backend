import { Router } from "express";
import { adminGetInquiryById, adminListInquiries } from "./inquiry-admin.controller.js";

const router = Router();

router.get("/", adminListInquiries);
router.get("/:id", adminGetInquiryById);

export default router;

