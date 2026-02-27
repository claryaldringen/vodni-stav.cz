import { describe, it, expect } from 'vitest';
import { periodToHours } from './periods';

describe('periodToHours', () => {
  it('returns 24 for "24h"', () => {
    expect(periodToHours('24h')).toBe(24);
  });

  it('returns 72 for "3d"', () => {
    expect(periodToHours('3d')).toBe(72);
  });

  it('returns 168 for "7d"', () => {
    expect(periodToHours('7d')).toBe(168);
  });

  it('returns 720 for "30d"', () => {
    expect(periodToHours('30d')).toBe(720);
  });

  it('falls back to 72 for unknown period', () => {
    expect(periodToHours('999d' as any)).toBe(72);
  });
});
