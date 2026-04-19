const express = require('express');

const protect = require('../../middlewares/auth.middleware');
const {
  getPlans,
  comparePlans,
  getCurrentSubscription,
  checkoutSubscription,
  cancelSubscription,
  changePlan,
  getSubscriptionHistory,
} = require('./subscription.controller');

const router = express.Router();

router.get('/plans', getPlans);
router.get('/plans/compare', comparePlans);
router.get('/subscriptions/current', protect, getCurrentSubscription);
router.post('/subscriptions/checkout', protect, checkoutSubscription);
router.patch('/subscriptions/cancel', protect, cancelSubscription);
router.patch('/subscriptions/change-plan', protect, changePlan);
router.get('/subscriptions/history', protect, getSubscriptionHistory);

module.exports = router;
