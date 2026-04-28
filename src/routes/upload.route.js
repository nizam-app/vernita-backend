import { Router } from "express";
import { protect } from "../middlewares/auth.js";
import { uploadImage } from "../middlewares/upload.middleware.js";
import { uploadSingleImage } from "../controllers/upload.controller.js";

const router = Router();

router.post("/image", protect, uploadImage, uploadSingleImage);

export default router;

