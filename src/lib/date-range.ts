import type { Granularity } from './types';

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 365 * 10; // 10 let

export const parseDateRange = (from: string | null, to: string | null): DateRange | null => {
  if (!from || !to) return null;
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) return null;

  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return null;
  if (fromDate >= toDate) return null;

  const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > MAX_RANGE_DAYS) return null;

  return { from, to };
};

export const granularityForRange = (range: DateRange): Granularity => {
  const fromDate = new Date(range.from);
  const toDate = new Date(range.to);
  const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays <= 3) return '10min';
  if (diffDays <= 30) return 'hour';
  if (diffDays <= 365) return 'day';
  if (diffDays <= 365 * 5) return 'month';
  return 'year';
};

export const dateRangeForDay = (date: string): DateRange => {
  const d = new Date(date);
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  return {
    from: date,
    to: next.toISOString().slice(0, 10),
  };
};

export const dateRangeForMonth = (year: number, month: number): DateRange => {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const to = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  return { from, to };
};

export const dateRangeForYear = (year: number): DateRange => ({
  from: `${year}-01-01`,
  to: `${year + 1}-01-01`,
});
