import { Router } from "express";
import {
  getSubscriptionManagement,
  listSubscriptions,
  getSubscriptionByUserId,
  listPayments,
  getPaymentById,
} from "./subscription-admin.controller.js";

const router = Router();

router.get("/subscriptions/management", getSubscriptionManagement);
router.get("/subscriptions", listSubscriptions);
router.get("/subscriptions/:userId", getSubscriptionByUserId);
router.get('/payments', listPayments);
router.get('/payments/:orderId', getPaymentById);

export default router;
