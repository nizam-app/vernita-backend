import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../utils/api-error.js";
import { Goal } from "./goal.model.js";

const normalizeString = (value) => String(value || "").trim();

const calculateProgress = (milestones = []) => {
  if (!milestones.length) return 0;

  const completedCount = milestones.filter((milestone) => milestone.completed).length;
  return Math.round((completedCount / milestones.length) * 100);
};

const applyProgressAndStatus = (goal) => {
  const progressPercent = calculateProgress(goal.milestones);
  goal.progressPercent = progressPercent;

  if (goal.status !== "archived") {
    if (goal.milestones.length > 0 && progressPercent === 100) {
      goal.status = "completed";
    } else if (goal.status === "completed" && progressPercent < 100) {
      goal.status = "active";
    }
  }

  return goal;
};

const normalizeMilestones = (milestones = []) => {
  return milestones.map((milestone) => ({
    title: normalizeString(milestone.title),
    completed: Boolean(milestone.completed),
    completedAt: milestone.completed ? milestone.completedAt || new Date() : null,
  }));
};

const normalizeGoalPayload = (payload) => {
  const normalized = { ...payload };

  if (normalized.title !== undefined) normalized.title = normalizeString(normalized.title);
  if (normalized.category !== undefined) normalized.category = normalizeString(normalized.category);
  if (normalized.description !== undefined) {
    normalized.description = normalizeString(normalized.description);
  }
  if (normalized.deadline !== undefined) {
    normalized.deadline = normalized.deadline ? new Date(normalized.deadline) : null;
  }
  if (normalized.milestones !== undefined) {
    normalized.milestones = normalizeMilestones(normalized.milestones);
  }

  return normalized;
};

const buildMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

const buildGoalFilter = (userId, query = {}) => {
  const filter = {
    userId,
    isDeleted: false,
  };

  if (query.category) filter.category = query.category;
  if (query.status) filter.status = query.status;
  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: "i" } },
      { category: { $regex: query.search, $options: "i" } },
    ];
  }
  if (query.deadlineFrom || query.deadlineTo) {
    filter.deadline = {};
    if (query.deadlineFrom) filter.deadline.$gte = query.deadlineFrom;
    if (query.deadlineTo) filter.deadline.$lte = query.deadlineTo;
  }

  return filter;
};

const sanitizeMilestone = (milestone) => ({
  id: milestone._id,
  title: milestone.title,
  completed: milestone.completed,
  completedAt: milestone.completedAt,
  createdAt: milestone.createdAt,
  updatedAt: milestone.updatedAt,
});

const sanitizeGoal = (goal) => ({
  id: goal._id,
  userId: goal.userId,
  title: goal.title,
  category: goal.category,
  deadline: goal.deadline,
  description: goal.description,
  status: goal.status,
  progressPercent: goal.progressPercent,
  milestones: (goal.milestones || []).map(sanitizeMilestone),
  isDeleted: goal.isDeleted,
  deletedAt: goal.deletedAt,
  createdAt: goal.createdAt,
  updatedAt: goal.updatedAt,
});

const findOwnedGoal = async (goalId, userId) => {
  const goal = await Goal.findOne({
    _id: goalId,
    userId,
    isDeleted: false,
  });

  if (!goal) {
    throw new ApiError(httpStatus.NOT_FOUND, "Goal not found.");
  }

  return goal;
};

const findMilestone = (goal, milestoneId) => {
  const milestone = goal.milestones.id(milestoneId);

  if (!milestone) {
    throw new ApiError(httpStatus.NOT_FOUND, "Milestone not found.");
  }

  return milestone;
};

export const createGoal = async (userId, payload) => {
  const goal = new Goal({
    ...normalizeGoalPayload(payload),
    userId,
  });

  applyProgressAndStatus(goal);
  await goal.save();

  return sanitizeGoal(goal);
};

export const getGoals = async (userId, query) => {
  const filter = buildGoalFilter(userId, query);
  const total = await Goal.countDocuments(filter);
  const goals = await Goal.find(filter)
    .sort({ [query.sortBy]: query.sortOrder })
    .skip((query.page - 1) * query.limit)
    .limit(query.limit);

  return {
    items: goals.map(sanitizeGoal),
    meta: buildMeta({ page: query.page, limit: query.limit, total }),
  };
};

export const getGoalById = async (goalId, userId) => {
  const goal = await findOwnedGoal(goalId, userId);
  return sanitizeGoal(goal);
};

export const updateGoal = async (goalId, userId, payload) => {
  const goal = await findOwnedGoal(goalId, userId);
  const normalizedPayload = normalizeGoalPayload(payload);

  Object.assign(goal, normalizedPayload);
  applyProgressAndStatus(goal);
  await goal.save();

  return sanitizeGoal(goal);
};

export const deleteGoal = async (goalId, userId) => {
  const goal = await findOwnedGoal(goalId, userId);
  const deletedGoal = sanitizeGoal(goal);

  await goal.deleteOne();

  return deletedGoal;
};

export const addMilestone = async (goalId, userId, payload) => {
  const goal = await findOwnedGoal(goalId, userId);

  goal.milestones.push({
    title: normalizeString(payload.title),
    completed: Boolean(payload.completed),
    completedAt: payload.completed ? new Date() : null,
  });
  applyProgressAndStatus(goal);
  await goal.save();

  return sanitizeGoal(goal);
};

export const updateMilestone = async (goalId, milestoneId, userId, payload) => {
  const goal = await findOwnedGoal(goalId, userId);
  const milestone = findMilestone(goal, milestoneId);

  if (payload.title !== undefined) milestone.title = normalizeString(payload.title);
  if (payload.completed !== undefined) {
    milestone.completed = payload.completed;
    milestone.completedAt = payload.completed ? milestone.completedAt || new Date() : null;
  }

  applyProgressAndStatus(goal);
  await goal.save();

  return sanitizeGoal(goal);
};

export const deleteMilestone = async (goalId, milestoneId, userId) => {
  const goal = await findOwnedGoal(goalId, userId);
  const milestone = findMilestone(goal, milestoneId);

  milestone.deleteOne();
  applyProgressAndStatus(goal);
  await goal.save();

  return sanitizeGoal(goal);
};

export const recalculateProgress = async (goalId, userId) => {
  const goal = await findOwnedGoal(goalId, userId);

  applyProgressAndStatus(goal);
  await goal.save();

  return sanitizeGoal(goal);
};

export const archiveGoal = async (goalId, userId) => {
  const goal = await findOwnedGoal(goalId, userId);

  goal.status = "archived";
  await goal.save();

  return sanitizeGoal(goal);
};

export const unarchiveGoal = async (goalId, userId) => {
  const goal = await findOwnedGoal(goalId, userId);

  goal.status = "active";
  applyProgressAndStatus(goal);
  await goal.save();

  return sanitizeGoal(goal);
};
