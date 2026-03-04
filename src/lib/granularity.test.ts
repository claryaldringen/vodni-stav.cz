import { describe, it, expect } from 'vitest';
import {
  isValidGranularity,
  isValidPeriodForGranularity,
  getGranularityOption,
  getDefaultPeriod,
  riverPeriodToHours,
  getPeriodsForGranularity,
  GRANULARITIES,
} from './granularity';

describe('isValidGranularity', () => {
  it.each(['10min', 'hour', 'day', 'month', 'year'] as const)(
    'returns true for valid granularity "%s"',
    (g) => {
      expect(isValidGranularity(g)).toBe(true);
    },
  );

  it.each(['minute', 'week', 'second', '', '10MIN'])('returns false for invalid "%s"', (g) => {
    expect(isValidGranularity(g)).toBe(false);
  });
});

describe('isValidPeriodForGranularity', () => {
  it('returns true for valid period-granularity combinations', () => {
    expect(isValidPeriodForGranularity('10min', '24h')).toBe(true);
    expect(isValidPeriodForGranularity('10min', '3d')).toBe(true);
    expect(isValidPeriodForGranularity('hour', '30d')).toBe(true);
    expect(isValidPeriodForGranularity('day', '1y')).toBe(true);
    expect(isValidPeriodForGranularity('month', 'all')).toBe(true);
    expect(isValidPeriodForGranularity('year', 'all')).toBe(true);
  });

  it('returns false for invalid combinations', () => {
    expect(isValidPeriodForGranularity('10min', '1y')).toBe(false);
    expect(isValidPeriodForGranularity('year', '24h')).toBe(false);
    expect(isValidPeriodForGranularity('day', 'all')).toBe(false);
  });
});

describe('getGranularityOption', () => {
  it('returns correct option for each granularity', () => {
    expect(getGranularityOption('10min').value).toBe('10min');
    expect(getGranularityOption('hour').value).toBe('hour');
    expect(getGranularityOption('day').value).toBe('day');
    expect(getGranularityOption('month').value).toBe('month');
    expect(getGranularityOption('year').value).toBe('year');
  });

  it('falls back to hour for unknown value', () => {
    // Cast to bypass type check for testing fallback
    expect(getGranularityOption('unknown' as 'hour').value).toBe('hour');
  });
});

describe('getDefaultPeriod', () => {
  it('returns correct default period for each granularity', () => {
    expect(getDefaultPeriod('10min')).toBe('24h');
    expect(getDefaultPeriod('hour')).toBe('3d');
    expect(getDefaultPeriod('day')).toBe('30d');
    expect(getDefaultPeriod('month')).toBe('1y');
    expect(getDefaultPeriod('year')).toBe('all');
  });
});

describe('riverPeriodToHours', () => {
  it('returns correct hours for each period', () => {
    expect(riverPeriodToHours('24h')).toBe(24);
    expect(riverPeriodToHours('3d')).toBe(72);
    expect(riverPeriodToHours('7d')).toBe(168);
    expect(riverPeriodToHours('30d')).toBe(720);
    expect(riverPeriodToHours('90d')).toBe(2160);
    expect(riverPeriodToHours('1y')).toBe(8760);
    expect(riverPeriodToHours('5y')).toBe(43800);
  });

  it('returns null for "all"', () => {
    expect(riverPeriodToHours('all')).toBeNull();
  });

  it('returns null for unknown period', () => {
    expect(riverPeriodToHours('unknown' as '24h')).toBeNull();
  });
});

describe('getPeriodsForGranularity', () => {
  it('returns correct periods for 10min', () => {
    const periods = getPeriodsForGranularity('10min');
    expect(periods.map((p) => p.value)).toEqual(['24h', '3d', '7d']);
  });

  it('returns correct periods for hour', () => {
    const periods = getPeriodsForGranularity('hour');
    expect(periods.map((p) => p.value)).toEqual(['24h', '3d', '7d', '30d']);
  });

  it('returns correct periods for day', () => {
    const periods = getPeriodsForGranularity('day');
    expect(periods.map((p) => p.value)).toEqual(['7d', '30d', '90d', '1y']);
  });

  it('returns correct periods for month', () => {
    const periods = getPeriodsForGranularity('month');
    expect(periods.map((p) => p.value)).toEqual(['1y', '5y', 'all']);
  });

  it('returns correct periods for year', () => {
    const periods = getPeriodsForGranularity('year');
    expect(periods.map((p) => p.value)).toEqual(['all']);
  });

  it('each period has label and hours', () => {
    for (const g of GRANULARITIES) {
      for (const p of g.periods) {
        expect(p).toHaveProperty('label');
        expect(p).toHaveProperty('hours');
        expect(typeof p.label).toBe('string');
      }
    }
  });
});
