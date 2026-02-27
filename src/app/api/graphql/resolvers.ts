import {
  fetchStations,
  fetchStationById,
  fetchMeasurements,
  fetchMeasurementStats,
  fetchStationAvailability,
  fetchRivers,
  fetchRiverById,
  fetchRiverMeasurements,
  fetchRiverMeasurementStats,
  fetchRiverAvailability,
} from '@/src/lib/queries';
import { parseDateRange } from '@/src/lib/date-range';
import type {
  Granularity,
  MeasurementStats,
  Period,
  RiverPeriod,
  Station,
  River,
  ValueStats,
} from '@/src/lib/types';

const periodEnumToValue: Record<string, Period> = {
  _24H: '24h',
  _3D: '3d',
  _7D: '7d',
  _30D: '30d',
};

const granularityEnumToValue: Record<string, Granularity> = {
  _10MIN: '10min',
  HOUR: 'hour',
  DAY: 'day',
  MONTH: 'month',
  YEAR: 'year',
};

const riverPeriodEnumToValue: Record<string, RiverPeriod> = {
  _24H: '24h',
  _3D: '3d',
  _7D: '7d',
  _30D: '30d',
  _90D: '90d',
  _1Y: '1y',
  _5Y: '5y',
  ALL: 'all',
};

const toAvailability = (rows: { year: number; month: number }[]) => {
  const years = [...new Set(rows.map((r) => r.year))];
  const byYear: Record<number, number[]> = {};
  for (const { year, month } of rows) {
    (byYear[year] ??= []).push(month);
  }
  return {
    years,
    yearMonths: years.map((y) => ({ year: y, months: byYear[y] })),
  };
};

export const resolvers = {
  Query: {
    stations: () => fetchStations(),
    station: (_: unknown, { id }: { id: number }) => fetchStationById(id),
    rivers: () => fetchRivers(),
    river: (_: unknown, { id }: { id: number }) => fetchRiverById(id),
  },
  Station: {
    idExternal: (s: Station) => s.id_external,
    riverName: (s: Station) => s.river_name,
    basinName: (s: Station) => s.basin_name,
    elevationM: (s: Station) => s.elevation_m,
    isActive: (s: Station) => s.is_active,
    measurements: (
      s: Station,
      { period, from, to }: { period: string; from?: string; to?: string },
    ) => {
      const dateRange = parseDateRange(from ?? null, to ?? null);
      return fetchMeasurements(s.id, periodEnumToValue[period] ?? '3d', dateRange);
    },
    measurementStats: (
      s: Station,
      { period, from, to }: { period: string; from?: string; to?: string },
    ) => {
      const dateRange = parseDateRange(from ?? null, to ?? null);
      return fetchMeasurementStats(s.id, periodEnumToValue[period] ?? '3d', dateRange);
    },
    availability: async (s: Station) => toAvailability(await fetchStationAvailability(s.id)),
  },
  River: {
    basinName: (r: River) => r.basin_name,
    stationCount: (r: River) => r.station_count,
    latestAvgDischargeM3s: (r: River) => r.latest_avg_discharge_m3s,
    measurements: (
      r: River,
      { granularity, period, from, to }: { granularity: string; period: string; from?: string; to?: string },
    ) => {
      const dateRange = parseDateRange(from ?? null, to ?? null);
      return fetchRiverMeasurements(
        r.id,
        granularityEnumToValue[granularity] ?? 'hour',
        riverPeriodEnumToValue[period] ?? '3d',
        dateRange,
      );
    },
    measurementStats: (
      r: River,
      { granularity, period, from, to }: { granularity: string; period: string; from?: string; to?: string },
    ) => {
      const dateRange = parseDateRange(from ?? null, to ?? null);
      return fetchRiverMeasurementStats(
        r.id,
        granularityEnumToValue[granularity] ?? 'hour',
        riverPeriodEnumToValue[period] ?? '3d',
        dateRange,
      );
    },
    availability: async (r: River) => toAvailability(await fetchRiverAvailability(r.id)),
  },
  Measurement: {
    waterLevelCm: (m: { water_level_cm: number | null }) => m.water_level_cm,
    dischargeM3s: (m: { discharge_m3s: number | null }) => m.discharge_m3s,
  },
  MeasurementStats: {
    waterLevelCm: (s: MeasurementStats) => s.water_level_cm,
    dischargeM3s: (s: MeasurementStats) => s.discharge_m3s,
  },
  ValueStats: {
    maxChange: (s: ValueStats) => s.max_change,
  },
};
