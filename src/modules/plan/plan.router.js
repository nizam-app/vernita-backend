import { Router } from "express";
import {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  updatePlanStatus,
  updatePlanRecommended,
  deletePlan,
} from "./plan.controller.js";

const router = Router();

router.route('/').post(createPlan).get(getPlans);
router.route('/:id').get(getPlanById).patch(updatePlan).delete(deletePlan);
router.patch('/:id/status', updatePlanStatus);
router.patch('/:id/recommended', updatePlanRecommended);

export default router;
