const express = require('express');

const {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  updatePlanStatus,
  updatePlanRecommended,
  deletePlan,
} = require('./plan.controller');

const router = express.Router();

router.route('/').post(createPlan).get(getPlans);
router.route('/:id').get(getPlanById).patch(updatePlan).delete(deletePlan);
router.patch('/:id/status', updatePlanStatus);
router.patch('/:id/recommended', updatePlanRecommended);

module.exports = router;
