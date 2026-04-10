export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  delayMs = 2000,
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[retry] Attempt ${attempt}/${maxAttempts} failed: ${msg}`);

      if (attempt < maxAttempts) {
        const wait = delayMs * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }

  throw lastError;
};
