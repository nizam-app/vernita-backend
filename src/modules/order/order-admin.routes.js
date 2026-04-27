import { Router } from "express";
import {
  adminGetOrderById,
  adminListOrders,
  adminRevenueReport,
} from "./order-admin.controller.js";

const router = Router();

// Payments + order history (all item types)
router.get("/", adminListOrders);

// Revenue reporting
router.get("/reports/revenue", adminRevenueReport);

// Single order details
router.get("/:orderId", adminGetOrderById);

export default router;

