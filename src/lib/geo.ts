export interface Coordinates {
  lat: number;
  lon: number;
}

const parseCoordinate = (value: string | null, limit: number): number | null => {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : null;
};

export const parseCoordinates = (lat: string | null, lon: string | null): Coordinates | null => {
  const parsedLat = parseCoordinate(lat, 90);
  const parsedLon = parseCoordinate(lon, 180);
  return parsedLat !== null && parsedLon !== null ? { lat: parsedLat, lon: parsedLon } : null;
};

// Na server posíláme polohu zaokrouhlenou na ~1 km – na nalezení nejbližší stanice to stačí.
export const roundCoordinate = (value: number): number => Math.round(value * 100) / 100;

interface RetryOptions extends PositionOptions {
  attempts?: number;
  retryDelayMs?: number;
}

// Chrome na macOS vrací dočasné kCLErrorLocationUnknown („poloha zatím neznámá“) jako chybu
// POSITION_UNAVAILABLE hned při prvním pokusu, i když ji systém o chvíli později zná.
// Proto to zkusíme znovu; jen odmítnuté oprávnění bereme jako konečné.
export const getCurrentPositionWithRetry = (
  geolocation: Pick<Geolocation, 'getCurrentPosition'>,
  { attempts = 3, retryDelayMs = 2000, ...options }: RetryOptions = {},
): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    const attempt = (remaining: number) => {
      geolocation.getCurrentPosition(
        resolve,
        (error) => {
          if (remaining > 1 && error.code !== error.PERMISSION_DENIED) {
            setTimeout(() => attempt(remaining - 1), retryDelayMs);
          } else {
            reject(error);
          }
        },
        options,
      );
    };
    attempt(attempts);
  });
