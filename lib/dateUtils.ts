// lib/dateUtils.ts

export const formatDate = (date: Date) => {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
};

export const getTodayDateString = () => {
  const today = new Date();
  return formatDate(today);
};

export const getYesterdayDateString = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDate(yesterday);
};

export const getTodayWeekday = () => {
  const today = new Date();
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return weekdays[today.getDay()];
};

export const daysBetween = (date1: string, date2: string) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};
