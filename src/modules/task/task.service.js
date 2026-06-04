import httpStatus from "../../constants/httpStatus.js";
import ApiError from "../../utils/api-error.js";
import { Task } from "./task.model.js";

const normalizeString = (value) => String(value || "").trim();

const getDayRange = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

const normalizeTaskPayload = (payload) => {
  const normalized = { ...payload };

  if (normalized.title !== undefined) normalized.title = normalizeString(normalized.title);
  if (normalized.type !== undefined) normalized.type = normalizeString(normalized.type);
  if (normalized.priority !== undefined) normalized.priority = normalizeString(normalized.priority);
  if (normalized.notes !== undefined) normalized.notes = normalizeString(normalized.notes);
  if (normalized.dueDate !== undefined) {
    normalized.dueDate = normalized.dueDate ? new Date(normalized.dueDate) : null;
  }
  if (normalized.completed !== undefined) {
    normalized.completedAt = normalized.completed ? new Date() : null;
  }

  return normalized;
};

const sanitizeTask = (task) => ({
  id: task._id,
  userId: task.userId,
  title: task.title,
  type: task.type,
  priority: task.priority,
  dueDate: task.dueDate,
  completed: task.completed,
  completedAt: task.completedAt,
  notes: task.notes,
  isDeleted: task.isDeleted,
  deletedAt: task.deletedAt,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

const buildMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

const buildTaskFilter = (userId, query = {}) => {
  const filter = {
    userId,
    isDeleted: false,
  };

  const today = getDayRange();

  if (query.filter === "today") {
    filter.dueDate = { $gte: today.start, $lt: today.end };
  }
  if (query.filter === "upcoming") {
    filter.dueDate = { $gte: today.end };
    filter.completed = false;
  }
  if (query.filter === "completed") {
    filter.completed = true;
  }
  if (query.type) filter.type = query.type;
  if (query.priority) filter.priority = query.priority;
  if (query.completed !== undefined) filter.completed = query.completed;
  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: "i" } },
      { notes: { $regex: query.search, $options: "i" } },
    ];
  }

  return filter;
};

const findOwnedTask = async (taskId, userId) => {
  const task = await Task.findOne({ _id: taskId, userId, isDeleted: false });
  if (!task) throw new ApiError(httpStatus.NOT_FOUND, "Task not found.");
  return task;
};

export const createTask = async (userId, payload) => {
  const task = await Task.create({
    ...normalizeTaskPayload(payload),
    userId,
  });

  return sanitizeTask(task);
};

export const getTasks = async (userId, query) => {
  const filter = buildTaskFilter(userId, query);
  const total = await Task.countDocuments(filter);
  const tasks = await Task.find(filter)
    .sort({ [query.sortBy]: query.sortOrder })
    .skip((query.page - 1) * query.limit)
    .limit(query.limit);

  return {
    items: tasks.map(sanitizeTask),
    meta: buildMeta({ page: query.page, limit: query.limit, total }),
  };
};

export const getTaskById = async (taskId, userId) => {
  const task = await findOwnedTask(taskId, userId);
  return sanitizeTask(task);
};

export const updateTask = async (taskId, userId, payload) => {
  const task = await findOwnedTask(taskId, userId);
  Object.assign(task, normalizeTaskPayload(payload));
  await task.save();

  return sanitizeTask(task);
};

export const completeTask = async (taskId, userId, completed = true) => {
  const task = await findOwnedTask(taskId, userId);

  task.completed = completed;
  task.completedAt = completed ? task.completedAt || new Date() : null;
  await task.save();

  return sanitizeTask(task);
};

export const deleteTask = async (taskId, userId) => {
  const task = await findOwnedTask(taskId, userId);
  const deletedTask = sanitizeTask(task);

  await task.deleteOne();

  return deletedTask;
};

export const getSummaryCounts = async (userId) => {
  const today = getDayRange();
  const base = { userId, isDeleted: false };

  const [all, todayCount, upcoming, completed] = await Promise.all([
    Task.countDocuments(base),
    Task.countDocuments({
      ...base,
      dueDate: { $gte: today.start, $lt: today.end },
    }),
    Task.countDocuments({
      ...base,
      dueDate: { $gte: today.end },
      completed: false,
    }),
    Task.countDocuments({ ...base, completed: true }),
  ]);

  return {
    all,
    today: todayCount,
    upcoming,
    completed,
  };
};
