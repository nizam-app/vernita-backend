export const normalizeDateOnly = (value = new Date()) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const addOneDay = (date) => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
};
