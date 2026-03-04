import { describe, it, expect } from 'vitest';
import {
  parseDateRange,
  granularityForRange,
  dateRangeForDay,
  dateRangeForMonth,
  dateRangeForYear,
} from './date-range';

describe('parseDateRange', () => {
  it('parses valid date range', () => {
    expect(parseDateRange('2024-01-01', '2024-01-31')).toEqual({
      from: '2024-01-01',
      to: '2024-01-31',
    });
  });

  it('returns null when from is null', () => {
    expect(parseDateRange(null, '2024-01-31')).toBeNull();
  });

  it('returns null when to is null', () => {
    expect(parseDateRange('2024-01-01', null)).toBeNull();
  });

  it('returns null when both are null', () => {
    expect(parseDateRange(null, null)).toBeNull();
  });

  it('returns null for invalid date format', () => {
    expect(parseDateRange('01-01-2024', '2024-01-31')).toBeNull();
    expect(parseDateRange('2024-01-01', '01/31/2024')).toBeNull();
  });

  it('returns null when from >= to', () => {
    expect(parseDateRange('2024-01-31', '2024-01-01')).toBeNull();
    expect(parseDateRange('2024-01-01', '2024-01-01')).toBeNull();
  });

  it('returns null when range exceeds 10 years', () => {
    expect(parseDateRange('2010-01-01', '2021-01-02')).toBeNull();
  });

  it('accepts range within 10 years', () => {
    // 365*10 = 3650 days; 2021-01-01 to 2030-12-31 = 3651 days (no extra leap)
    expect(parseDateRange('2021-01-01', '2030-12-27')).not.toBeNull();
  });

  it('rejects range exactly at 10 calendar years due to leap days', () => {
    // 2010-01-01 to 2020-01-01 = 3653 days (> 3650)
    expect(parseDateRange('2010-01-01', '2020-01-01')).toBeNull();
  });

  it('returns null for empty strings', () => {
    expect(parseDateRange('', '2024-01-31')).toBeNull();
    expect(parseDateRange('2024-01-01', '')).toBeNull();
  });

  it('returns null for invalid date values matching format', () => {
    expect(parseDateRange('2024-13-01', '2024-14-01')).toBeNull();
  });
});

describe('granularityForRange', () => {
  it('returns 10min for <= 3 days', () => {
    expect(granularityForRange({ from: '2024-01-01', to: '2024-01-02' })).toBe('10min');
    expect(granularityForRange({ from: '2024-01-01', to: '2024-01-04' })).toBe('10min');
  });

  it('returns hour for <= 30 days', () => {
    expect(granularityForRange({ from: '2024-01-01', to: '2024-01-05' })).toBe('hour');
    expect(granularityForRange({ from: '2024-01-01', to: '2024-01-31' })).toBe('hour');
  });

  it('returns day for <= 365 days', () => {
    expect(granularityForRange({ from: '2024-01-01', to: '2024-03-01' })).toBe('day');
    expect(granularityForRange({ from: '2024-01-01', to: '2024-12-31' })).toBe('day');
  });

  it('returns month for <= 5 years', () => {
    expect(granularityForRange({ from: '2020-01-01', to: '2022-01-01' })).toBe('month');
    // 365*5 = 1825 days; use a range that stays within
    expect(granularityForRange({ from: '2021-01-01', to: '2025-12-28' })).toBe('month');
  });

  it('returns year for exactly 5 calendar years (due to leap days)', () => {
    // 2020-01-01 to 2025-01-01 = 1827 days (> 1825)
    expect(granularityForRange({ from: '2020-01-01', to: '2025-01-01' })).toBe('year');
  });

  it('returns year for > 5 years', () => {
    expect(granularityForRange({ from: '2010-01-01', to: '2020-01-01' })).toBe('year');
  });
});

describe('dateRangeForDay', () => {
  it('returns range for a single day', () => {
    expect(dateRangeForDay('2024-03-15')).toEqual({
      from: '2024-03-15',
      to: '2024-03-16',
    });
  });

  it('handles month boundary', () => {
    expect(dateRangeForDay('2024-01-31')).toEqual({
      from: '2024-01-31',
      to: '2024-02-01',
    });
  });

  it('handles year boundary', () => {
    expect(dateRangeForDay('2024-12-31')).toEqual({
      from: '2024-12-31',
      to: '2025-01-01',
    });
  });
});

describe('dateRangeForMonth', () => {
  it('returns range for a regular month', () => {
    expect(dateRangeForMonth(2024, 3)).toEqual({
      from: '2024-03-01',
      to: '2024-04-01',
    });
  });

  it('handles December to January transition', () => {
    expect(dateRangeForMonth(2024, 12)).toEqual({
      from: '2024-12-01',
      to: '2025-01-01',
    });
  });

  it('pads single-digit months', () => {
    expect(dateRangeForMonth(2024, 1)).toEqual({
      from: '2024-01-01',
      to: '2024-02-01',
    });
  });
});

describe('dateRangeForYear', () => {
  it('returns range for a year', () => {
    expect(dateRangeForYear(2024)).toEqual({
      from: '2024-01-01',
      to: '2025-01-01',
    });
  });

  it('handles year boundary', () => {
    expect(dateRangeForYear(2099)).toEqual({
      from: '2099-01-01',
      to: '2100-01-01',
    });
  });
});
