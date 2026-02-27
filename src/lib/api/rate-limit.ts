const TEST_LIMIT = 60; // max requests per minute for test keys
const WINDOW_MS = 60_000;
const PURGE_INTERVAL_MS = 5 * 60_000; // purge stale entries every 5 min

const windows = new Map<string, number[]>();
let lastPurge = Date.now();

const purgeStaleEntries = (now: number) => {
  for (const [key, timestamps] of windows) {
    const valid = timestamps.filter((t) => now - t < WINDOW_MS);
    if (valid.length === 0) {
      windows.delete(key);
    } else {
      windows.set(key, valid);
    }
  }
  lastPurge = now;
};

export const checkRateLimit = (keyHash: string): { allowed: boolean; remaining: number } => {
  const now = Date.now();

  // Periodic purge to prevent unbounded Map growth
  if (now - lastPurge > PURGE_INTERVAL_MS) {
    purgeStaleEntries(now);
  }

  const timestamps = windows.get(keyHash) ?? [];

  // Remove entries outside the window
  const valid = timestamps.filter((t) => now - t < WINDOW_MS);
  valid.push(now);
  windows.set(keyHash, valid);

  const allowed = valid.length <= TEST_LIMIT;
  const remaining = Math.max(0, TEST_LIMIT - valid.length);
  return { allowed, remaining };
};
