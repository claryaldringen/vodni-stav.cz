import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must re-import fresh module for each test to reset state
let checkRateLimit: typeof import('./rate-limit').checkRateLimit;

describe('checkRateLimit', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    // Re-import to reset module-level state (windows Map)
    vi.resetModules();
    const mod = await import('./rate-limit');
    checkRateLimit = mod.checkRateLimit;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows first request', () => {
    const result = checkRateLimit('test-key');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59);
  });

  it('allows up to 60 requests', () => {
    for (let i = 0; i < 59; i++) {
      checkRateLimit('test-key');
    }
    const result = checkRateLimit('test-key');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('denies 61st request', () => {
    for (let i = 0; i < 60; i++) {
      checkRateLimit('test-key');
    }
    const result = checkRateLimit('test-key');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('isolates different keys', () => {
    for (let i = 0; i < 60; i++) {
      checkRateLimit('key-a');
    }
    const resultA = checkRateLimit('key-a');
    const resultB = checkRateLimit('key-b');

    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });

  it('resets after window expires', () => {
    for (let i = 0; i < 60; i++) {
      checkRateLimit('test-key');
    }
    expect(checkRateLimit('test-key').allowed).toBe(false);

    // Advance past the 60s window
    vi.advanceTimersByTime(60_001);

    const result = checkRateLimit('test-key');
    expect(result.allowed).toBe(true);
  });

  it('sliding window drops old entries', () => {
    // Make 30 requests
    for (let i = 0; i < 30; i++) {
      checkRateLimit('test-key');
    }

    // Advance 30s
    vi.advanceTimersByTime(30_000);

    // Make 30 more requests (60 total, but first 30 are still in window)
    for (let i = 0; i < 30; i++) {
      checkRateLimit('test-key');
    }
    expect(checkRateLimit('test-key').allowed).toBe(false);

    // Advance another 31s — first batch now outside window
    vi.advanceTimersByTime(31_000);

    const result = checkRateLimit('test-key');
    expect(result.allowed).toBe(true);
  });
});
