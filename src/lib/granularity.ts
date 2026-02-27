import type { Granularity, RiverPeriod } from './types';

export interface GranularityOption {
  value: Granularity;
  label: string;
  periods: RiverPeriodOption[];
  defaultPeriod: RiverPeriod;
}

export interface RiverPeriodOption {
  value: RiverPeriod;
  label: string;
  hours: number | null; // null = vše
}

const P_24H: RiverPeriodOption = { value: '24h', label: '24 hodin', hours: 24 };
const P_3D: RiverPeriodOption = { value: '3d', label: '3 dny', hours: 72 };
const P_7D: RiverPeriodOption = { value: '7d', label: '7 dnů', hours: 168 };
const P_30D: RiverPeriodOption = { value: '30d', label: '30 dnů', hours: 720 };
const P_90D: RiverPeriodOption = { value: '90d', label: '90 dnů', hours: 2160 };
const P_1Y: RiverPeriodOption = { value: '1y', label: '1 rok', hours: 8760 };
const P_5Y: RiverPeriodOption = { value: '5y', label: '5 let', hours: 43800 };
const P_ALL: RiverPeriodOption = { value: 'all', label: 'Vše', hours: null };

export const GRANULARITIES: GranularityOption[] = [
  { value: '10min', label: '10 min', periods: [P_24H, P_3D, P_7D], defaultPeriod: '24h' },
  { value: 'hour', label: 'Hodiny', periods: [P_24H, P_3D, P_7D, P_30D], defaultPeriod: '3d' },
  {
    value: 'day',
    label: 'Dny',
    periods: [P_7D, P_30D, P_90D, P_1Y],
    defaultPeriod: '30d',
  },
  { value: 'month', label: 'Měsíce', periods: [P_1Y, P_5Y, P_ALL], defaultPeriod: '1y' },
  { value: 'year', label: 'Roky', periods: [P_ALL], defaultPeriod: 'all' },
];

export const DEFAULT_GRANULARITY: Granularity = 'hour';

export const getGranularityOption = (g: Granularity): GranularityOption =>
  GRANULARITIES.find((o) => o.value === g) ?? GRANULARITIES[1];

export const getPeriodsForGranularity = (g: Granularity): RiverPeriodOption[] =>
  getGranularityOption(g).periods;

export const getDefaultPeriod = (g: Granularity): RiverPeriod =>
  getGranularityOption(g).defaultPeriod;

export const riverPeriodToHours = (period: RiverPeriod): number | null => {
  const all: RiverPeriodOption[] = [P_24H, P_3D, P_7D, P_30D, P_90D, P_1Y, P_5Y, P_ALL];
  return all.find((p) => p.value === period)?.hours ?? null;
};

export const isValidGranularity = (v: string): v is Granularity =>
  GRANULARITIES.some((g) => g.value === v);

export const isValidPeriodForGranularity = (g: Granularity, p: string): p is RiverPeriod =>
  getGranularityOption(g).periods.some((o) => o.value === p);
