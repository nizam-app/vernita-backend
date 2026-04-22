import httpStatus from "../../../constants/httpStatus.js";
import ApiError from "../../../utils/api-error.js";
import { SelfCareEntry } from "./selfCare.model.js";
import {
  buildCompletedSections,
  buildMoodCounts,
  getDateRange,
  getTodayDate,
  normalizeDateOnly,
  roundOne,
} from "./selfCare.utils.js";

const normalizeString = (value) => String(value || "").trim();

const buildMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

const normalizePayload = (payload = {}) => {
  const normalized = { ...payload };

  if (normalized.notes !== undefined) normalized.notes = normalizeString(normalized.notes);
  if (normalized.mood === "") normalized.mood = null;
  if (normalized.stressLevel === undefined) delete normalized.stressLevel;

  return normalized;
};

const applyDerivedFields = (entry) => {
  entry.completedSections = buildCompletedSections(entry);
  return entry;
};

const buildDefaultTodayEntry = (userId, entryDate = getTodayDate()) => ({
  id: null,
  userId,
  entryDate,
  hydration: {
    current: 0,
    goal: 8,
  },
  sleep: {
    hours: 0,
  },
  mood: null,
  meditationDone: false,
  stressLevel: null,
  notes: "",
  completedSections: {
    hydration: false,
    sleep: false,
    mood: false,
    meditation: false,
    stress: false,
  },
  exists: false,
});

const formatEntry = (entry) => {
  if (!entry) return null;

  return {
    id: entry._id,
    userId: entry.userId,
    entryDate: entry.entryDate,
    hydration: {
      current: entry.hydrationGlasses,
      goal: entry.hydrationGoal,
    },
    sleep: {
      hours: entry.sleepHours,
    },
    mood: entry.mood,
    meditationDone: entry.meditationDone,
    stressLevel: entry.stressLevel,
    notes: entry.notes,
    completedSections: entry.completedSections || buildCompletedSections(entry),
    isDeleted: entry.isDeleted,
    deletedAt: entry.deletedAt,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    exists: true,
  };
};

const findOwnedEntry = async (userId, id) => {
  const entry = await SelfCareEntry.findOne({
    _id: id,
    userId,
    isDeleted: false,
  });

  if (!entry) throw new ApiError(httpStatus.NOT_FOUND, "Self-care entry not found.");

  return entry;
};

const getEntriesForStats = async (userId, filters = {}, defaultDays = 7) => {
  const range = getDateRange({ ...filters, defaultDays });
  return SelfCareEntry.find({
    userId,
    isDeleted: false,
    entryDate: {
      $gte: range.start,
      $lt: range.endExclusive,
    },
  }).sort({ entryDate: 1 });
};

const calculateStats = (entries) => {
  const entriesCount = entries.length;
  const hydrationTotal = entries.reduce((sum, entry) => sum + entry.hydrationGlasses, 0);
  const sleepTotal = entries.reduce((sum, entry) => sum + entry.sleepHours, 0);
  const stressEntries = entries.filter((entry) => entry.stressLevel !== null && entry.stressLevel !== undefined);
  const stressTotal = stressEntries.reduce((sum, entry) => sum + entry.stressLevel, 0);
  const meditationDaysCount = entries.filter((entry) => entry.meditationDone).length;
  const hydrationCompletedDays = entries.filter(
    (entry) => entry.hydrationGlasses >= entry.hydrationGoal
  ).length;

  return {
    entriesCount,
    totalHydrationGlasses: hydrationTotal,
    averageHydrationPerDay: entriesCount ? roundOne(hydrationTotal / entriesCount) : 0,
    averageSleepHours: entriesCount ? roundOne(sleepTotal / entriesCount) : 0,
    meditationDaysCount,
    averageStressLevel: stressEntries.length ? roundOne(stressTotal / stressEntries.length) : 0,
    hydrationConsistency: entriesCount
      ? Math.round((hydrationCompletedDays / entriesCount) * 100)
      : 0,
    moodCounts: buildMoodCounts(entries),
  };
};

export const getTodayEntry = async (userId) => {
  const entryDate = getTodayDate();
  const entry = await SelfCareEntry.findOne({ userId, entryDate, isDeleted: false });

  return entry ? formatEntry(entry) : buildDefaultTodayEntry(userId, entryDate);
};

export const upsertTodayEntry = async (userId, payload) => {
  const entryDate = getTodayDate();
  const normalizedPayload = normalizePayload(payload);
  const entry = await SelfCareEntry.findOne({ userId, entryDate, isDeleted: false });

  if (entry) {
    Object.assign(entry, normalizedPayload);
    applyDerivedFields(entry);
    await entry.save();
    return formatEntry(entry);
  }

  const createdEntry = new SelfCareEntry({
    userId,
    entryDate,
    ...normalizedPayload,
  });
  applyDerivedFields(createdEntry);
  await createdEntry.save();

  return formatEntry(createdEntry);
};

export const patchTodayEntry = async (userId, payload) => {
  return upsertTodayEntry(userId, payload);
};

export const getHistory = async (userId, filters) => {
  const query = { userId, isDeleted: false };

  if (filters.startDate || filters.endDate) {
    query.entryDate = {};
    if (filters.startDate) query.entryDate.$gte = filters.startDate;
    if (filters.endDate) {
      const endDate = normalizeDateOnly(filters.endDate);
      endDate.setDate(endDate.getDate() + 1);
      query.entryDate.$lt = endDate;
    }
  }

  const total = await SelfCareEntry.countDocuments(query);
  const entries = await SelfCareEntry.find(query)
    .sort({ entryDate: filters.sortOrder })
    .skip((filters.page - 1) * filters.limit)
    .limit(filters.limit);

  return {
    items: entries.map(formatEntry),
    meta: buildMeta({ page: filters.page, limit: filters.limit, total }),
  };
};

export const getEntryById = async (userId, id) => {
  const entry = await findOwnedEntry(userId, id);
  return formatEntry(entry);
};

export const softDeleteEntry = async (userId, id) => {
  const entry = await findOwnedEntry(userId, id);
  const deletedEntry = formatEntry(entry);

  await entry.deleteOne();

  return deletedEntry;
};

export const getWeeklyStats = async (userId, filters = {}) => {
  const entries = await getEntriesForStats(userId, filters, 7);
  return calculateStats(entries);
};

export const getSummaryStats = async (userId, filters = {}) => {
  const entries = await getEntriesForStats(userId, filters, 7);
  return calculateStats(entries);
};
