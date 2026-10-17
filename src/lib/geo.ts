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
