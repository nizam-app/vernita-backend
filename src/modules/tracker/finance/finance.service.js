import httpStatus from "../../../constants/httpStatus.js";
import ApiError from "../../../utils/api-error.js";
import { BudgetSettings } from "./budgetSettings.model.js";
import { FinanceTransaction } from "./financeTransaction.model.js";
import { SavingsGoal } from "./savingsGoal.model.js";

const normalizeString = (value) => String(value || "").trim();

const addOneDay = (date) => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
};

const getMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const endExclusive = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, endExclusive };
};

const normalizeTransactionPayload = (payload) => {
  const normalized = { ...payload };
  if (normalized.description !== undefined) normalized.description = normalizeString(normalized.description);
  if (normalized.category !== undefined) normalized.category = normalizeString(normalized.category);
  if (normalized.notes !== undefined) normalized.notes = normalizeString(normalized.notes);
  if (normalized.transactionDate !== undefined) normalized.transactionDate = new Date(normalized.transactionDate);
  return normalized;
};

const normalizeSavingsGoalPayload = (payload) => {
  const normalized = { ...payload };
  if (normalized.title !== undefined) normalized.title = normalizeString(normalized.title);
  if (normalized.targetDate !== undefined) normalized.targetDate = normalized.targetDate ? new Date(normalized.targetDate) : null;
  return normalized;
};

const applySavingsGoalProgress = (goal) => {
  goal.progressPercent = Math.min(
    100,
    Math.round((goal.currentAmount / goal.targetAmount) * 100)
  );
  if (goal.status !== "archived" && goal.currentAmount >= goal.targetAmount) {
    goal.status = "completed";
  }
  if (goal.status === "completed" && goal.currentAmount < goal.targetAmount) {
    goal.status = "active";
  }
  return goal;
};

const buildMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

const sanitizeTransaction = (transaction) => ({
  id: transaction._id,
  userId: transaction.userId,
  type: transaction.type,
  description: transaction.description,
  amount: transaction.amount,
  category: transaction.category,
  transactionDate: transaction.transactionDate,
  notes: transaction.notes,
  isDeleted: transaction.isDeleted,
  deletedAt: transaction.deletedAt,
  createdAt: transaction.createdAt,
  updatedAt: transaction.updatedAt,
});

const sanitizeSavingsGoal = (goal) => ({
  id: goal._id,
  userId: goal.userId,
  title: goal.title,
  targetAmount: goal.targetAmount,
  currentAmount: goal.currentAmount,
  targetDate: goal.targetDate,
  progressPercent: goal.progressPercent,
  status: goal.status,
  isDeleted: goal.isDeleted,
  deletedAt: goal.deletedAt,
  createdAt: goal.createdAt,
  updatedAt: goal.updatedAt,
});

const sanitizeBudget = (budget) => ({
  id: budget?._id || null,
  userId: budget?.userId || null,
  monthlyBudget: budget?.monthlyBudget || 0,
  currency: budget?.currency || "USD",
  createdAt: budget?.createdAt || null,
  updatedAt: budget?.updatedAt || null,
});

const buildTransactionFilter = (userId, filters = {}) => {
  const query = { userId, isDeleted: false };
  if (filters.type) query.type = filters.type;
  if (filters.category) query.category = filters.category;
  if (filters.search) {
    query.$or = [
      { description: { $regex: filters.search, $options: "i" } },
      { category: { $regex: filters.search, $options: "i" } },
    ];
  }
  if (filters.startDate || filters.endDate) {
    query.transactionDate = {};
    if (filters.startDate) query.transactionDate.$gte = filters.startDate;
    if (filters.endDate) query.transactionDate.$lt = addOneDay(filters.endDate);
  }
  return query;
};

const findOwnedTransaction = async (userId, id) => {
  const transaction = await FinanceTransaction.findOne({ _id: id, userId, isDeleted: false });
  if (!transaction) throw new ApiError(httpStatus.NOT_FOUND, "Transaction not found.");
  return transaction;
};

const findOwnedSavingsGoal = async (userId, id) => {
  const goal = await SavingsGoal.findOne({ _id: id, userId, isDeleted: false });
  if (!goal) throw new ApiError(httpStatus.NOT_FOUND, "Savings goal not found.");
  return goal;
};

const calculateTransactionSummary = async (userId, filters = {}) => {
  let rangeFilters = filters;
  if (!filters.startDate && !filters.endDate) {
    const monthRange = getMonthRange();
    const lastDayOfMonth = new Date(monthRange.endExclusive);
    lastDayOfMonth.setDate(lastDayOfMonth.getDate() - 1);
    rangeFilters = { ...filters, startDate: monthRange.start, endDate: lastDayOfMonth };
  }
  const transactions = await FinanceTransaction.find(buildTransactionFilter(userId, rangeFilters));
  const totalIncome = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalExpenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    totalIncome,
    totalExpenses,
    savings: totalIncome - totalExpenses,
  };
};

export const createTransaction = async (userId, payload) => {
  const transaction = await FinanceTransaction.create({
    ...normalizeTransactionPayload(payload),
    userId,
  });
  return sanitizeTransaction(transaction);
};

export const getTransactions = async (userId, filters) => {
  const query = buildTransactionFilter(userId, filters);
  const total = await FinanceTransaction.countDocuments(query);
  const transactions = await FinanceTransaction.find(query)
    .sort({ [filters.sortBy]: filters.sortOrder })
    .skip((filters.page - 1) * filters.limit)
    .limit(filters.limit);

  return {
    items: transactions.map(sanitizeTransaction),
    meta: buildMeta({ page: filters.page, limit: filters.limit, total }),
  };
};

export const getTransactionById = async (userId, id) => {
  const transaction = await findOwnedTransaction(userId, id);
  return sanitizeTransaction(transaction);
};

export const updateTransaction = async (userId, id, payload) => {
  const transaction = await findOwnedTransaction(userId, id);
  Object.assign(transaction, normalizeTransactionPayload(payload));
  await transaction.save();
  return sanitizeTransaction(transaction);
};

export const deleteTransaction = async (userId, id) => {
  const transaction = await findOwnedTransaction(userId, id);
  transaction.isDeleted = true;
  transaction.deletedAt = new Date();
  await transaction.save();
  return sanitizeTransaction(transaction);
};

export const getRecentTransactions = async (userId, { limit }) => {
  const transactions = await FinanceTransaction.find({ userId, isDeleted: false })
    .sort({ transactionDate: -1, createdAt: -1 })
    .limit(limit);
  return transactions.map(sanitizeTransaction);
};

export const getTransactionSummary = async (userId, filters = {}) => {
  const summary = await calculateTransactionSummary(userId, filters);
  const budget = await BudgetSettings.findOne({ userId });
  return {
    ...summary,
    budgetUsedPercent: budget?.monthlyBudget
      ? Math.round((summary.totalExpenses / budget.monthlyBudget) * 100)
      : 0,
    monthlyBudget: budget?.monthlyBudget || 0,
    currency: budget?.currency || "USD",
  };
};

export const createSavingsGoal = async (userId, payload) => {
  const goal = new SavingsGoal({
    ...normalizeSavingsGoalPayload(payload),
    userId,
  });
  applySavingsGoalProgress(goal);
  await goal.save();
  return sanitizeSavingsGoal(goal);
};

export const getSavingsGoals = async (userId, filters) => {
  const query = { userId, isDeleted: false };
  if (filters.status) query.status = filters.status;
  const total = await SavingsGoal.countDocuments(query);
  const goals = await SavingsGoal.find(query)
    .sort({ createdAt: -1 })
    .skip((filters.page - 1) * filters.limit)
    .limit(filters.limit);
  return {
    items: goals.map(sanitizeSavingsGoal),
    meta: buildMeta({ page: filters.page, limit: filters.limit, total }),
  };
};

export const getSavingsGoalById = async (userId, id) => {
  const goal = await findOwnedSavingsGoal(userId, id);
  return sanitizeSavingsGoal(goal);
};

export const updateSavingsGoal = async (userId, id, payload) => {
  const goal = await findOwnedSavingsGoal(userId, id);
  Object.assign(goal, normalizeSavingsGoalPayload(payload));
  applySavingsGoalProgress(goal);
  await goal.save();
  return sanitizeSavingsGoal(goal);
};

export const deleteSavingsGoal = async (userId, id) => {
  const goal = await findOwnedSavingsGoal(userId, id);
  goal.isDeleted = true;
  goal.deletedAt = new Date();
  await goal.save();
  return sanitizeSavingsGoal(goal);
};

export const updateSavingsGoalProgress = async (userId, id, currentAmount) => {
  const goal = await findOwnedSavingsGoal(userId, id);
  goal.currentAmount = currentAmount;
  applySavingsGoalProgress(goal);
  await goal.save();
  return sanitizeSavingsGoal(goal);
};

export const archiveSavingsGoal = async (userId, id) => {
  const goal = await findOwnedSavingsGoal(userId, id);
  goal.status = "archived";
  await goal.save();
  return sanitizeSavingsGoal(goal);
};

export const unarchiveSavingsGoal = async (userId, id) => {
  const goal = await findOwnedSavingsGoal(userId, id);
  goal.status = "active";
  applySavingsGoalProgress(goal);
  await goal.save();
  return sanitizeSavingsGoal(goal);
};

export const getBudget = async (userId) => {
  const budget = await BudgetSettings.findOne({ userId });
  return sanitizeBudget(budget);
};

export const updateBudget = async (userId, payload) => {
  const update = {};
  if (payload.monthlyBudget !== undefined) update.monthlyBudget = payload.monthlyBudget;
  if (payload.currency !== undefined) update.currency = normalizeString(payload.currency).toUpperCase();

  const budget = await BudgetSettings.findOneAndUpdate(
    { userId },
    { $set: update, $setOnInsert: { userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return sanitizeBudget(budget);
};

export const getDashboard = async (userId, filters = {}) => {
  const summary = await getTransactionSummary(userId, filters);
  const recentTransactions = await getRecentTransactions(userId, { limit: 5 });
  const activeSavingsGoals = await SavingsGoal.find({
    userId,
    isDeleted: false,
    status: { $in: ["active", "completed"] },
  })
    .sort({ createdAt: -1 })
    .limit(5);

  return {
    ...summary,
    activeSavingsGoals: activeSavingsGoals.map(sanitizeSavingsGoal),
    recentTransactions,
  };
};
