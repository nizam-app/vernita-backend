export const normalizeDateOnly = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
};

export const getTodayDate = () => normalizeDateOnly(new Date());

export const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

export const getDateRange = ({ startDate, endDate, defaultDays = 7 } = {}) => {
  const end = endDate ? normalizeDateOnly(endDate) : getTodayDate();
  const start = startDate ? normalizeDateOnly(startDate) : addDays(end, -(defaultDays - 1));

  return {
    start,
    end,
    endExclusive: addDays(end, 1),
  };
};

export const buildCompletedSections = (entry) => ({
  hydration: Number(entry.hydrationGlasses || 0) > 0,
  sleep: Number(entry.sleepHours || 0) > 0,
  mood: Boolean(entry.mood),
  meditation: Boolean(entry.meditationDone),
  stress: entry.stressLevel !== null && entry.stressLevel !== undefined,
});

export const buildMoodCounts = (entries) => {
  const counts = {
    great: 0,
    good: 0,
    okay: 0,
    bad: 0,
  };

  for (const entry of entries) {
    if (entry.mood && counts[entry.mood] !== undefined) counts[entry.mood] += 1;
  }

  return counts;
};

export const roundOne = (value) => Math.round(value * 10) / 10;
