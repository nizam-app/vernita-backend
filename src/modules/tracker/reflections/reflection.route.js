import { Router } from "express";
import { protect } from "../../../middlewares/auth.js";
import {
  createReflection,
  deleteReflection,
  getReflectionByDate,
  getReflectionById,
  getReflections,
  updateReflection,
} from "./reflection.controller.js";

const router = Router();

router.use(protect);

router.route("/").post(createReflection).get(getReflections);
router.get("/by-date/:date", getReflectionByDate);
router.route("/:id").get(getReflectionById).patch(updateReflection).delete(deleteReflection);

export default router;
