const express = require('express');

const {
  listSubscriptions,
  getSubscriptionByUserId,
  listPayments,
  getPaymentById,
} = require('./subscription-admin.controller');

const router = express.Router();

router.get('/subscriptions', listSubscriptions);
router.get('/subscriptions/:userId', getSubscriptionByUserId);
router.get('/payments', listPayments);
router.get('/payments/:orderId', getPaymentById);

module.exports = router;
