import { describe, it, expect } from 'vitest';
import { parseCoordinates, roundCoordinate } from './geo';

describe('parseCoordinates', () => {
  it('parses valid latitude and longitude', () => {
    expect(parseCoordinates('50.08', '14.42')).toEqual({ lat: 50.08, lon: 14.42 });
  });

  it('rejects missing, non-numeric and out-of-range values', () => {
    expect(parseCoordinates(null, '14.42')).toBeNull();
    expect(parseCoordinates('50.08', '')).toBeNull();
    expect(parseCoordinates('abc', '14.42')).toBeNull();
    expect(parseCoordinates('91', '14.42')).toBeNull();
    expect(parseCoordinates('50.08', '-181')).toBeNull();
    expect(parseCoordinates('Infinity', '14.42')).toBeNull();
  });
});

describe('roundCoordinate', () => {
  it('rounds to two decimals (about 1 km)', () => {
    expect(roundCoordinate(50.08765)).toBe(50.09);
    expect(roundCoordinate(14.4213)).toBe(14.42);
  });
});
