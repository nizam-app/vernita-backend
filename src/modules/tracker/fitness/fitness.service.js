import httpStatus from "../../../constants/httpStatus.js";
import ApiError from "../../../utils/api-error.js";
import { FitnessEntry } from "./fitness.model.js";

const normalizeString = (value) => String(value || "").trim();

const getWeekRange = (date = new Date()) => {
  const current = new Date(date);
  current.setHours(0, 0, 0, 0);
  const day = current.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(current);
  start.setDate(current.getDate() + diffToMonday);
  const endExclusive = new Date(start);
  endExclusive.setDate(start.getDate() + 7);
  return { start, endExclusive };
};

const addOneDay = (date) => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
};

const normalizePayload = (payload) => {
  const normalized = { ...payload };

  if (normalized.workoutType !== undefined) normalized.workoutType = normalizeString(normalized.workoutType);
  if (normalized.notes !== undefined) normalized.notes = normalizeString(normalized.notes);
  if (normalized.workoutDate !== undefined) normalized.workoutDate = new Date(normalized.workoutDate);
  if (normalized.caloriesBurned === undefined) delete normalized.caloriesBurned;

  return normalized;
};

const sanitizeEntry = (entry) => ({
  id: entry._id,
  userId: entry.userId,
  workoutType: entry.workoutType,
  durationMinutes: entry.durationMinutes,
  caloriesBurned: entry.caloriesBurned,
  workoutDate: entry.workoutDate,
  notes: entry.notes,
  isDeleted: entry.isDeleted,
  deletedAt: entry.deletedAt,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
});

const buildMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

const buildFilter = (userId, filters = {}) => {
  const filter = {
    userId,
    isDeleted: false,
  };

  if (filters.workoutType) filter.workoutType = filters.workoutType;
  if (filters.search) {
    filter.workoutType = { $regex: filters.search, $options: "i" };
  }
  if (filters.startDate || filters.endDate) {
    filter.workoutDate = {};
    if (filters.startDate) filter.workoutDate.$gte = filters.startDate;
    if (filters.endDate) filter.workoutDate.$lt = addOneDay(filters.endDate);
  }

  return filter;
};

const findOwnedEntry = async (userId, id) => {
  const entry = await FitnessEntry.findOne({ _id: id, userId, isDeleted: false });
  if (!entry) throw new ApiError(httpStatus.NOT_FOUND, "Fitness entry not found.");
  return entry;
};

export const createFitnessEntry = async (userId, payload) => {
  const entry = await FitnessEntry.create({
    ...normalizePayload(payload),
    userId,
  });

  return sanitizeEntry(entry);
};

export const getFitnessEntries = async (userId, filters) => {
  const query = buildFilter(userId, filters);
  const total = await FitnessEntry.countDocuments(query);
  const entries = await FitnessEntry.find(query)
    .sort({ [filters.sortBy]: filters.sortOrder })
    .skip((filters.page - 1) * filters.limit)
    .limit(filters.limit);

  return {
    items: entries.map(sanitizeEntry),
    meta: buildMeta({ page: filters.page, limit: filters.limit, total }),
  };
};

export const getFitnessEntryById = async (userId, id) => {
  const entry = await findOwnedEntry(userId, id);
  return sanitizeEntry(entry);
};

export const updateFitnessEntry = async (userId, id, payload) => {
  const entry = await findOwnedEntry(userId, id);
  Object.assign(entry, normalizePayload(payload));
  await entry.save();

  return sanitizeEntry(entry);
};

export const deleteFitnessEntry = async (userId, id) => {
  const entry = await findOwnedEntry(userId, id);

  entry.isDeleted = true;
  entry.deletedAt = new Date();
  await entry.save();

  return sanitizeEntry(entry);
};

export const getRecentActivity = async (userId, { limit }) => {
  const entries = await FitnessEntry.find({ userId, isDeleted: false })
    .sort({ workoutDate: -1, createdAt: -1 })
    .limit(limit);

  return entries.map((entry) => ({
    id: entry._id,
    workoutType: entry.workoutType,
    durationMinutes: entry.durationMinutes,
    caloriesBurned: entry.caloriesBurned,
    workoutDate: entry.workoutDate,
  }));
};

export const getWeeklyStats = async (userId, filters = {}) => {
  let start = filters.startDate;
  let endExclusive = filters.endDate ? addOneDay(filters.endDate) : null;

  if (!start && !endExclusive) {
    const range = getWeekRange();
    start = range.start;
    endExclusive = range.endExclusive;
  } else if (!start) {
    start = getWeekRange(filters.endDate).start;
  } else if (!endExclusive) {
    const range = getWeekRange(filters.startDate);
    endExclusive = range.endExclusive;
  }

  const entries = await FitnessEntry.find({
    userId,
    isDeleted: false,
    workoutDate: {
      $gte: start,
      $lt: endExclusive,
    },
  }).sort({ workoutDate: -1 });

  const totalMinutes = entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  const totalCalories = entries.reduce((sum, entry) => sum + entry.caloriesBurned, 0);

  return {
    totalWorkouts: entries.length,
    totalMinutes,
    totalCalories,
    entriesCount: entries.length,
    recentEntries: entries.slice(0, 5).map(sanitizeEntry),
  };
};
