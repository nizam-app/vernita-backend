import { Router } from "express";
import { createInquiry } from "./inquiry.controller.js";

const router = Router();

// Public endpoint (no auth)
router.post("/", createInquiry);

export default router;

