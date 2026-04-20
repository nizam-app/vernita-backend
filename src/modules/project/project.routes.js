import { Router } from "express";
import { protect } from "../../middlewares/auth.js";
import { authorizeAdmin } from "../../middlewares/admin.js";
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from "./project.controller.js";

const router = Router();

router.use(protect);

router.route('/').get(getProjects).post(authorizeAdmin, createProject);
router
  .route('/:projectId')
  .get(getProjectById)
  .patch(authorizeAdmin, updateProject)
  .delete(authorizeAdmin, deleteProject);

export default router;
