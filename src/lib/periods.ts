import type { Period } from './types';

export interface PeriodOption {
  value: Period;
  label: string;
  hours: number;
}

export const PERIODS: PeriodOption[] = [
  { value: '24h', label: '24 hodin', hours: 24 },
  { value: '3d', label: '3 dny', hours: 72 },
  { value: '7d', label: '7 dnů', hours: 168 },
  { value: '30d', label: '30 dnů', hours: 720 },
];

export const DEFAULT_PERIOD: Period = '3d';

export const periodToHours = (period: Period): number => {
  const found = PERIODS.find((p) => p.value === period);
  return found ? found.hours : 72;
};
