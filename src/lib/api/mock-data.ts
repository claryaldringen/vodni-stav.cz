import type {
  Station,
  Measurement,
  MeasurementStats,
  River,
  Granularity,
  RiverPeriod,
  Period,
  ValueStats,
} from '../types';

const MOCK_STATIONS: Station[] = [
  {
    id: 1,
    id_external: 'TEST001',
    code: 'TST1',
    name: 'Praha - Testovací',
    river_name: 'Vltava',
    basin_name: 'Vltava',
    lat: 50.0755,
    lon: 14.4378,
    elevation_m: 190,
    is_active: true,
    meta: null,
  },
  {
    id: 2,
    id_external: 'TEST002',
    code: 'TST2',
    name: 'Brno - Testovací',
    river_name: 'Svratka',
    basin_name: 'Morava',
    lat: 49.1951,
    lon: 16.6068,
    elevation_m: 205,
    is_active: true,
    meta: null,
  },
  {
    id: 3,
    id_external: 'TEST003',
    code: 'TST3',
    name: 'Olomouc - Testovací',
    river_name: 'Morava',
    basin_name: 'Morava',
    lat: 49.5938,
    lon: 17.2509,
    elevation_m: 219,
    is_active: true,
    meta: null,
  },
  {
    id: 4,
    id_external: 'TEST004',
    code: 'TST4',
    name: 'Plzeň - Testovací',
    river_name: 'Berounka',
    basin_name: 'Vltava',
    lat: 49.7384,
    lon: 13.3736,
    elevation_m: 310,
    is_active: true,
    meta: null,
  },
  {
    id: 5,
    id_external: 'TEST005',
    code: 'TST5',
    name: 'Hradec Králové - Testovací',
    river_name: 'Labe',
    basin_name: 'Labe',
    lat: 50.2104,
    lon: 15.8327,
    elevation_m: 235,
    is_active: true,
    meta: null,
  },
];

const MOCK_RIVERS: River[] = [
  {
    id: 1,
    name: 'Vltava',
    basin_name: 'Vltava',
    station_count: 2,
    latest_avg_discharge_m3s: 85.3,
  },
  {
    id: 2,
    name: 'Morava',
    basin_name: 'Morava',
    station_count: 1,
    latest_avg_discharge_m3s: 42.7,
  },
  {
    id: 3,
    name: 'Labe',
    basin_name: 'Labe',
    station_count: 1,
    latest_avg_discharge_m3s: 120.1,
  },
];

const PERIOD_HOURS: Record<Period | RiverPeriod, number> = {
  '24h': 24,
  '3d': 72,
  '7d': 168,
  '30d': 720,
  '90d': 2160,
  '1y': 8760,
  '5y': 43800,
  all: 87600,
};

const GRANULARITY_MINUTES: Record<Granularity, number> = {
  '10min': 10,
  hour: 60,
  day: 1440,
  month: 43200,
  year: 525600,
};

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const generateMeasurements = (
  period: Period | RiverPeriod,
  granularity: Granularity = '10min',
): Measurement[] => {
  const hours = PERIOD_HOURS[period] ?? 72;
  const stepMinutes = GRANULARITY_MINUTES[granularity];
  const totalMinutes = hours * 60;
  const count = Math.min(Math.floor(totalMinutes / stepMinutes), 500);

  const now = new Date();
  const measurements: Measurement[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const ts = new Date(now.getTime() - i * stepMinutes * 60_000);
    const seed = ts.getTime() / 60_000;
    const level = 80 + seededRandom(seed) * 120;
    const discharge = 5 + seededRandom(seed + 1) * 50;

    measurements.push({
      ts: ts.toISOString(),
      water_level_cm: Math.round(level * 10) / 10,
      discharge_m3s: Math.round(discharge * 100) / 100,
    });
  }

  return measurements;
};

export const mockStations = (): Station[] => MOCK_STATIONS;

export const mockStation = (id: number): Station | null =>
  MOCK_STATIONS.find((s) => s.id === id) ?? null;

export const mockStationMeasurements = (period: Period): Measurement[] =>
  generateMeasurements(period, '10min');

export const mockRivers = (): River[] => MOCK_RIVERS;

export const mockRiver = (id: number): River | null =>
  MOCK_RIVERS.find((r) => r.id === id) ?? null;

export const mockRiverMeasurements = (
  granularity: Granularity,
  period: RiverPeriod,
): Measurement[] => generateMeasurements(period, granularity);

const computeMockStats = (measurements: Measurement[]): MeasurementStats => {
  const wlValues = measurements.map((m) => m.water_level_cm).filter((v): v is number => v !== null);
  const qValues = measurements.map((m) => m.discharge_m3s).filter((v): v is number => v !== null);

  const buildStats = (values: number[]): ValueStats | null => {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    let maxChange: number | null = null;
    for (let i = 1; i < values.length; i++) {
      const diff = Math.abs(values[i] - values[i - 1]);
      if (maxChange === null || diff > maxChange) maxChange = diff;
    }

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100,
      median: Math.round(median * 100) / 100,
      max_change: maxChange !== null ? Math.round(maxChange * 100) / 100 : null,
    };
  };

  return {
    water_level_cm: buildStats(wlValues),
    discharge_m3s: buildStats(qValues),
  };
};

export const mockStationStats = (period: Period): MeasurementStats =>
  computeMockStats(mockStationMeasurements(period));

export const mockRiverStats = (
  granularity: Granularity,
  period: RiverPeriod,
): MeasurementStats => computeMockStats(mockRiverMeasurements(granularity, period));

// ── Mock availability ──────────────────────────────────────────────────

const MOCK_AVAILABILITY_YEARS = [2024, 2025, 2026];
const MOCK_AVAILABILITY_MONTHS: Record<number, number[]> = {
  2024: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  2025: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  2026: [1, 2],
};

const mockAvailability = (
  yearParam: string | null,
  monthParam: string | null,
): { years: number[]; months: Record<number, number[]> } | { days: number[] } => {
  if (yearParam && monthParam) {
    const year = Number(yearParam);
    const month = Number(monthParam);
    const daysInMonth = new Date(year, month, 0).getDate();
    return { days: Array.from({ length: daysInMonth }, (_, i) => i + 1) };
  }
  return { years: MOCK_AVAILABILITY_YEARS, months: MOCK_AVAILABILITY_MONTHS };
};

export const mockStationAvailability = (
  id: number,
  yearParam: string | null,
  monthParam: string | null,
) => {
  if (!mockStation(id)) return null;
  return mockAvailability(yearParam, monthParam);
};

export const mockRiverAvailability = (
  id: number,
  yearParam: string | null,
  monthParam: string | null,
) => {
  if (!mockRiver(id)) return null;
  return mockAvailability(yearParam, monthParam);
};
