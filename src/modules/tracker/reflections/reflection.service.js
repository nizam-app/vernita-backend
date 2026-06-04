import httpStatus from "../../../constants/httpStatus.js";
import ApiError from "../../../utils/api-error.js";
import { ReflectionEntry } from "./reflection.model.js";
import { addOneDay, normalizeDateOnly } from "./reflection.utils.js";

const normalizeString = (value) => String(value || "").trim();

const buildMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

const formatReflection = (entry) => ({
  id: entry._id,
  userId: entry.userId,
  entryDate: entry.entryDate,
  reflectionText: entry.reflectionText,
  gratitudeText: entry.gratitudeText,
  mood: entry.mood,
  isDeleted: entry.isDeleted,
  deletedAt: entry.deletedAt,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
});

const normalizePayload = (payload = {}) => {
  const normalized = { ...payload };
  if (normalized.entryDate !== undefined) normalized.entryDate = normalizeDateOnly(normalized.entryDate);
  if (normalized.reflectionText !== undefined) normalized.reflectionText = normalizeString(normalized.reflectionText);
  if (normalized.gratitudeText !== undefined) normalized.gratitudeText = normalizeString(normalized.gratitudeText);
  if (normalized.mood === "") normalized.mood = null;
  return normalized;
};

const buildHistoryQuery = (userId, filters = {}) => {
  const query = { userId, isDeleted: false };

  if (filters.startDate || filters.endDate) {
    query.entryDate = {};
    if (filters.startDate) query.entryDate.$gte = filters.startDate;
    if (filters.endDate) query.entryDate.$lt = addOneDay(filters.endDate);
  }

  if (filters.search) {
    query.$or = [
      { reflectionText: { $regex: filters.search, $options: "i" } },
      { gratitudeText: { $regex: filters.search, $options: "i" } },
    ];
  }

  return query;
};

const findOwnedReflection = async (userId, id) => {
  const entry = await ReflectionEntry.findOne({ _id: id, userId, isDeleted: false });
  if (!entry) throw new ApiError(httpStatus.NOT_FOUND, "Reflection entry not found.");
  return entry;
};

const assertDateIsAvailable = async (userId, entryDate, currentId = null) => {
  const duplicate = await ReflectionEntry.findOne({
    userId,
    entryDate,
    isDeleted: false,
    ...(currentId ? { _id: { $ne: currentId } } : {}),
  });

  if (duplicate) {
    throw new ApiError(httpStatus.CONFLICT, "A reflection entry already exists for this date.");
  }
};

export const createReflection = async (userId, payload) => {
  const normalizedPayload = normalizePayload(payload);
  await assertDateIsAvailable(userId, normalizedPayload.entryDate);

  try {
    const entry = await ReflectionEntry.create({ ...normalizedPayload, userId });
    return formatReflection(entry);
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(httpStatus.CONFLICT, "A reflection entry already exists for this date.");
    }
    throw error;
  }
};

export const getReflections = async (userId, filters) => {
  const query = buildHistoryQuery(userId, filters);
  const total = await ReflectionEntry.countDocuments(query);
  const entries = await ReflectionEntry.find(query)
    .sort({ entryDate: filters.sortOrder, createdAt: filters.sortOrder })
    .skip((filters.page - 1) * filters.limit)
    .limit(filters.limit);

  return {
    items: entries.map(formatReflection),
    meta: buildMeta({ page: filters.page, limit: filters.limit, total }),
  };
};

export const getReflectionById = async (userId, id) => {
  const entry = await findOwnedReflection(userId, id);
  return formatReflection(entry);
};

export const getReflectionByDate = async (userId, date) => {
  const entryDate = normalizeDateOnly(date);
  const entry = await ReflectionEntry.findOne({ userId, entryDate, isDeleted: false });
  if (!entry) throw new ApiError(httpStatus.NOT_FOUND, "Reflection entry not found for this date.");
  return formatReflection(entry);
};

export const updateReflection = async (userId, id, payload) => {
  const entry = await findOwnedReflection(userId, id);
  const normalizedPayload = normalizePayload(payload);

  if (normalizedPayload.entryDate !== undefined) {
    await assertDateIsAvailable(userId, normalizedPayload.entryDate, entry._id);
  }

  Object.assign(entry, normalizedPayload);

  try {
    await entry.save();
    return formatReflection(entry);
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(httpStatus.CONFLICT, "A reflection entry already exists for this date.");
    }
    throw error;
  }
};

export const deleteReflection = async (userId, id) => {
  const entry = await findOwnedReflection(userId, id);
  entry.isDeleted = true;
  entry.deletedAt = new Date();
  await entry.save();
  return formatReflection(entry);
};
