import { describe, it, expect } from 'vitest';
import { formatNumber, formatWaterLevel, formatDischarge, formatDistance } from './format';

describe('formatNumber', () => {
  it('returns "–" for null', () => {
    expect(formatNumber(null)).toBe('–');
  });

  it('formats number with cs-CZ locale', () => {
    const result = formatNumber(123.456, 2);
    // cs-CZ uses comma as decimal separator
    expect(result).toContain('123');
    expect(result).toContain('46');
  });
});

describe('formatWaterLevel', () => {
  it('formats water level in cm', () => {
    expect(formatWaterLevel(150)).toBe('150 cm');
  });

  it('returns "–" for null', () => {
    expect(formatWaterLevel(null)).toBe('–');
  });
});

describe('formatDischarge', () => {
  it('formats discharge in m³/s', () => {
    const result = formatDischarge(3.14);
    expect(result).toContain('3');
    expect(result).toContain('14');
    expect(result).toContain('m³/s');
  });

  it('returns "–" for null', () => {
    expect(formatDischarge(null)).toBe('–');
  });
});

describe('formatDistance', () => {
  it('formats distances under 1 km in meters rounded to tens', () => {
    expect(formatDistance(0.834)).toBe('830 m');
  });

  it('formats distances under 10 km with one decimal', () => {
    expect(formatDistance(2.345)).toBe('2,3 km');
  });

  it('formats longer distances in whole kilometers', () => {
    expect(formatDistance(12.6)).toBe('13 km');
  });
});
