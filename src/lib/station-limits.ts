export interface StationLimit {
  label: string;
  waterLevelCm: number | null;
  dischargeM3s: number | null;
}

// Klíče limitů v meta1.json ČHMÚ – H = vodní stav (cm), Q = průtok (m³/s)
const LIMIT_KEYS = [
  { key: 'drought', label: 'Sucho', h: 'DRYH', q: 'DRYQ' },
  { key: 'spa1', label: '1. SPA – bdělost', h: 'SPA1H', q: 'SPA1Q' },
  { key: 'spa2', label: '2. SPA – pohotovost', h: 'SPA2H', q: 'SPA2Q' },
  { key: 'spa3', label: '3. SPA – ohrožení', h: 'SPA3H', q: 'SPA3Q' },
  { key: 'spa4', label: 'Extrémní povodeň', h: 'SPA4H', q: 'SPA4Q' },
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

export type StationStageKey = (typeof LIMIT_KEYS)[number]['key'] | 'normal';

export interface StationStage {
  key: StationStageKey;
  label: string;
}

const NORMAL_STAGE: StationStage = { key: 'normal', label: 'Běžný stav' };

// Stupeň povodňové aktivity nebo sucho podle posledního měření. SPA_TYP v meta1.json určuje,
// jestli jsou limity stanovené vodním stavem (H) nebo průtokem (Q). Když se ta veličina neměří,
// použije se druhá.
export const getStationStage = (
  meta: unknown,
  measurement: { water_level_cm: number | null; discharge_m3s: number | null },
): StationStage | null => {
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) return null;
  const row = meta as Record<string, unknown>;

  const preferred = row.SPA_TYP === 'Q' ? 'q' : 'h';
  const quantities = preferred === 'q' ? (['q', 'h'] as const) : (['h', 'q'] as const);

  for (const quantity of quantities) {
    const value = quantity === 'h' ? measurement.water_level_cm : measurement.discharge_m3s;
    if (value === null) continue;

    const thresholds = LIMIT_KEYS.map((limit) => ({
      ...limit,
      threshold: toLimitValue(row[limit[quantity]]),
    })).filter((limit) => limit.threshold !== null);
    if (thresholds.length === 0) continue;

    const reachedFlood = thresholds
      .filter((limit) => limit.key !== 'drought' && value >= (limit.threshold as number))
      .at(-1);
    if (reachedFlood) return { key: reachedFlood.key, label: reachedFlood.label };

    const drought = thresholds.find((limit) => limit.key === 'drought');
    if (drought && value <= (drought.threshold as number)) {
      return { key: drought.key, label: drought.label };
    }
    return NORMAL_STAGE;
  }

  return null;
};
