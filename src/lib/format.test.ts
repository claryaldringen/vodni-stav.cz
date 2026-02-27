import { describe, it, expect } from 'vitest';
import { formatNumber, formatWaterLevel, formatDischarge } from './format';

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
