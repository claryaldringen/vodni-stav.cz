export interface StationLimit {
  label: string;
  waterLevelCm: number | null;
  dischargeM3s: number | null;
}

// Klíče limitů v meta1.json ČHMÚ – H = vodní stav (cm), Q = průtok (m³/s)
const LIMIT_KEYS = [
  { label: 'Sucho', h: 'DRYH', q: 'DRYQ' },
  { label: '1. SPA – bdělost', h: 'SPA1H', q: 'SPA1Q' },
  { label: '2. SPA – pohotovost', h: 'SPA2H', q: 'SPA2Q' },
  { label: '3. SPA – ohrožení', h: 'SPA3H', q: 'SPA3Q' },
  { label: 'Extrémní povodeň', h: 'SPA4H', q: 'SPA4Q' },
] as const;

const toLimitValue = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export const extractStationLimits = (meta: unknown): StationLimit[] => {
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) return [];
  const row = meta as Record<string, unknown>;

  return LIMIT_KEYS.map(({ label, h, q }) => ({
    label,
    waterLevelCm: toLimitValue(row[h]),
    dischargeM3s: toLimitValue(row[q]),
  })).filter((limit) => limit.waterLevelCm !== null || limit.dischargeM3s !== null);
};
