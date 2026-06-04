import httpStatus from "../../../constants/httpStatus.js";
import ApiResponse from "../../../utils/api-response.js";
import { catchAsync } from "../../../utils/catchAsync.js";
import * as financeService from "./finance.service.js";
import {
  validateBudgetUpdate,
  validateCreateSavingsGoal,
  validateCreateTransaction,
  validateRangeQuery,
  validateRecentQuery,
  validateSavingsGoalIdParam,
  validateSavingsGoalListQuery,
  validateSavingsGoalProgress,
  validateTransactionIdParam,
  validateTransactionListQuery,
  validateUpdateSavingsGoal,
  validateUpdateTransaction,
} from "./finance.validation.js";

export const createTransaction = catchAsync(async (req, res) => {
  validateCreateTransaction(req.body);
  const transaction = await financeService.createTransaction(req.user._id, req.body);
  return ApiResponse.success(res, { statusCode: httpStatus.CREATED, message: "Transaction created successfully.", data: transaction });
});

export const getTransactions = catchAsync(async (req, res) => {
  const filters = validateTransactionListQuery(req.query);
  const result = await financeService.getTransactions(req.user._id, filters);
  return ApiResponse.success(res, { message: "Transactions fetched successfully.", data: result.items, meta: result.meta });
});

export const getTransactionById = catchAsync(async (req, res) => {
  validateTransactionIdParam(req.params.id);
  const transaction = await financeService.getTransactionById(req.user._id, req.params.id);
  return ApiResponse.success(res, { message: "Transaction fetched successfully.", data: transaction });
});

export const updateTransaction = catchAsync(async (req, res) => {
  validateTransactionIdParam(req.params.id);
  validateUpdateTransaction(req.body);
  const transaction = await financeService.updateTransaction(req.user._id, req.params.id, req.body);
  return ApiResponse.success(res, { message: "Transaction updated successfully.", data: transaction });
});

export const deleteTransaction = catchAsync(async (req, res) => {
  validateTransactionIdParam(req.params.id);
  const transaction = await financeService.deleteTransaction(req.user._id, req.params.id);
  return ApiResponse.success(res, { message: "Transaction deleted successfully.", data: transaction });
});

export const getRecentTransactions = catchAsync(async (req, res) => {
  const filters = validateRecentQuery(req.query);
  const transactions = await financeService.getRecentTransactions(req.user._id, filters);
  return ApiResponse.success(res, { message: "Recent transactions fetched successfully.", data: transactions });
});

export const getTransactionSummary = catchAsync(async (req, res) => {
  const filters = validateRangeQuery(req.query);
  const summary = await financeService.getTransactionSummary(req.user._id, filters);
  return ApiResponse.success(res, { message: "Finance summary fetched successfully.", data: summary });
});

export const createSavingsGoal = catchAsync(async (req, res) => {
  validateCreateSavingsGoal(req.body);
  const goal = await financeService.createSavingsGoal(req.user._id, req.body);
  return ApiResponse.success(res, { statusCode: httpStatus.CREATED, message: "Savings goal created successfully.", data: goal });
});

export const getSavingsGoals = catchAsync(async (req, res) => {
  const filters = validateSavingsGoalListQuery(req.query);
  const result = await financeService.getSavingsGoals(req.user._id, filters);
  return ApiResponse.success(res, { message: "Savings goals fetched successfully.", data: result.items, meta: result.meta });
});

export const getSavingsGoalById = catchAsync(async (req, res) => {
  validateSavingsGoalIdParam(req.params.id);
  const goal = await financeService.getSavingsGoalById(req.user._id, req.params.id);
  return ApiResponse.success(res, { message: "Savings goal fetched successfully.", data: goal });
});

export const updateSavingsGoal = catchAsync(async (req, res) => {
  validateSavingsGoalIdParam(req.params.id);
  validateUpdateSavingsGoal(req.body);
  const goal = await financeService.updateSavingsGoal(req.user._id, req.params.id, req.body);
  return ApiResponse.success(res, { message: "Savings goal updated successfully.", data: goal });
});

export const deleteSavingsGoal = catchAsync(async (req, res) => {
  validateSavingsGoalIdParam(req.params.id);
  const goal = await financeService.deleteSavingsGoal(req.user._id, req.params.id);
  return ApiResponse.success(res, { message: "Savings goal deleted successfully.", data: goal });
});

export const updateSavingsGoalProgress = catchAsync(async (req, res) => {
  validateSavingsGoalIdParam(req.params.id);
  validateSavingsGoalProgress(req.body);
  const goal = await financeService.updateSavingsGoalProgress(req.user._id, req.params.id, req.body.currentAmount);
  return ApiResponse.success(res, { message: "Savings goal progress updated successfully.", data: goal });
});

export const archiveSavingsGoal = catchAsync(async (req, res) => {
  validateSavingsGoalIdParam(req.params.id);
  const goal = await financeService.archiveSavingsGoal(req.user._id, req.params.id);
  return ApiResponse.success(res, { message: "Savings goal archived successfully.", data: goal });
});

export const unarchiveSavingsGoal = catchAsync(async (req, res) => {
  validateSavingsGoalIdParam(req.params.id);
  const goal = await financeService.unarchiveSavingsGoal(req.user._id, req.params.id);
  return ApiResponse.success(res, { message: "Savings goal unarchived successfully.", data: goal });
});

export const getBudget = catchAsync(async (req, res) => {
  const budget = await financeService.getBudget(req.user._id);
  return ApiResponse.success(res, { message: "Budget settings fetched successfully.", data: budget });
});

export const updateBudget = catchAsync(async (req, res) => {
  validateBudgetUpdate(req.body);
  const budget = await financeService.updateBudget(req.user._id, req.body);
  return ApiResponse.success(res, { message: "Budget settings updated successfully.", data: budget });
});

export const getDashboard = catchAsync(async (req, res) => {
  const filters = validateRangeQuery(req.query);
  const dashboard = await financeService.getDashboard(req.user._id, filters);
  return ApiResponse.success(res, { message: "Finance dashboard fetched successfully.", data: dashboard });
});
