import { Router } from "express";
import { protect } from "../../../middlewares/auth.js";
import {
  archiveSavingsGoal,
  createSavingsGoal,
  createTransaction,
  deleteSavingsGoal,
  deleteTransaction,
  getBudget,
  getDashboard,
  getRecentTransactions,
  getSavingsGoalById,
  getSavingsGoals,
  getTransactionById,
  getTransactionSummary,
  getTransactions,
  unarchiveSavingsGoal,
  updateBudget,
  updateSavingsGoal,
  updateSavingsGoalProgress,
  updateTransaction,
} from "./finance.controller.js";

const router = Router();

router.use(protect);

router.get("/dashboard", getDashboard);
router.get("/budget", getBudget);
router.patch("/budget", updateBudget);

router.route("/transactions").post(createTransaction).get(getTransactions);
router.get("/transactions/recent", getRecentTransactions);
router.get("/transactions/stats/summary", getTransactionSummary);
router.route("/transactions/:id").get(getTransactionById).patch(updateTransaction).delete(deleteTransaction);

router.route("/goals").post(createSavingsGoal).get(getSavingsGoals);
router.patch("/goals/:id/progress", updateSavingsGoalProgress);
router.patch("/goals/:id/archive", archiveSavingsGoal);
router.patch("/goals/:id/unarchive", unarchiveSavingsGoal);
router.route("/goals/:id").get(getSavingsGoalById).patch(updateSavingsGoal).delete(deleteSavingsGoal);

export default router;
