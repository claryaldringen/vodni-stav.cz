import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentPositionWithRetry, parseCoordinates, roundCoordinate } from './geo';

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

describe('getCurrentPositionWithRetry', () => {
  const position = { coords: { latitude: 50.08, longitude: 14.42 } } as GeolocationPosition;
  const geoError = (code: number) => ({ code, PERMISSION_DENIED: 1 }) as GeolocationPositionError;

  // Simuluje navigator.geolocation: každý pokus vrátí další výsledek ze seznamu
  const fakeGeolocation = (results: (GeolocationPosition | GeolocationPositionError)[]) => {
    const getCurrentPosition = vi.fn(
      (onSuccess: PositionCallback, onError?: PositionErrorCallback | null) => {
        const result = results.shift();
        if (result && 'coords' in result) onSuccess(result);
        else onError?.(result as GeolocationPositionError);
      },
    );
    return { getCurrentPosition };
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with the first position', async () => {
    const geolocation = fakeGeolocation([position]);
    await expect(getCurrentPositionWithRetry(geolocation)).resolves.toBe(position);
    expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('retries when the position is temporarily unavailable', async () => {
    const geolocation = fakeGeolocation([geoError(2), position]);
    const result = getCurrentPositionWithRetry(geolocation, { retryDelayMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    await expect(result).resolves.toBe(position);
    expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it('does not retry when the user denied the permission', async () => {
    const denied = geoError(1);
    const geolocation = fakeGeolocation([denied, position]);
    await expect(getCurrentPositionWithRetry(geolocation)).rejects.toBe(denied);
    expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('rejects with the last error after all attempts fail', async () => {
    const last = geoError(3);
    const geolocation = fakeGeolocation([geoError(2), geoError(2), last]);
    const result = getCurrentPositionWithRetry(geolocation, { attempts: 3, retryDelayMs: 500 });
    const assertion = expect(result).rejects.toBe(last);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(3);
  });
});
