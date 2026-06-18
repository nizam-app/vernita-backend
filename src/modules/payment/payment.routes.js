import { Router } from "express";
import { protect } from "../../middlewares/auth.js";
import { confirmCheckout } from "./payment.controller.js";

const router = Router();

router.post("/checkout/confirm", protect, confirmCheckout);

export default router;
