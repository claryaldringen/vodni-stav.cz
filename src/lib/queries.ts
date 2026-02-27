import { connectDb } from './db';
import { periodToHours } from './periods';
import { riverPeriodToHours } from './granularity';
import { slugify } from './slug';
import type { DateRange } from './date-range';
import type {
  Granularity,
  Measurement,
  MeasurementStats,
  Period,
  River,
  RiverPeriod,
  Station,
  ValueStats,
} from './types';

export const fetchStations = async (): Promise<Station[]> => {
  const sql = await connectDb();
  return sql<Station[]>`
    SELECT s.id, s.id_external, s.code, s.name,
           r.name AS river_name,
           b.name AS basin_name,
           s.lat, s.lon, s.elevation_m, s.is_active, s.meta
    FROM station s
    LEFT JOIN river r ON r.id = s.river_id
    LEFT JOIN basin b ON b.id = s.basin_id
    WHERE s.is_active = true
      AND s.name IS DISTINCT FROM s.id_external
    ORDER BY s.name`;
};

export const fetchStationById = async (id: number): Promise<Station | null> => {
  const sql = await connectDb();
  const rows = await sql<Station[]>`
    SELECT s.id, s.id_external, s.code, s.name,
           r.name AS river_name,
           b.name AS basin_name,
           s.lat, s.lon, s.elevation_m, s.is_active, s.meta
    FROM station s
    LEFT JOIN river r ON r.id = s.river_id
    LEFT JOIN basin b ON b.id = s.basin_id
    WHERE s.id = ${id}`;
  return rows[0] ?? null;
};

// Cached slug → station id map (avoids loading all stations on every page view)
let slugCache: { map: Map<string, number>; cachedAt: number } | null = null;
const SLUG_CACHE_TTL_MS = 60_000; // 1 minute

const getSlugMap = async (): Promise<Map<string, number>> => {
  const now = Date.now();
  if (slugCache && now - slugCache.cachedAt < SLUG_CACHE_TTL_MS) {
    return slugCache.map;
  }

  const sql = await connectDb();
  const rows = await sql<{ id: number; name: string }[]>`
    SELECT id, name FROM station
    WHERE is_active = true AND name IS DISTINCT FROM id_external
  `;

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(slugify(row.name), row.id);
  }
  slugCache = { map, cachedAt: now };
  return map;
};

export const fetchStationBySlug = async (slug: string): Promise<Station | null> => {
  const map = await getSlugMap();
  const stationId = map.get(slug);
  if (stationId === undefined) return null;
  return fetchStationById(stationId);
};

export const fetchStationsByRiverId = async (riverId: number): Promise<Station[]> => {
  const sql = await connectDb();
  return sql<Station[]>`
    SELECT s.id, s.id_external, s.code, s.name,
           r.name AS river_name,
           b.name AS basin_name,
           s.lat, s.lon, s.elevation_m, s.is_active, s.meta
    FROM station s
    LEFT JOIN river r ON r.id = s.river_id
    LEFT JOIN basin b ON b.id = s.basin_id
    WHERE s.river_id = ${riverId} AND s.is_active = true
      AND s.name IS DISTINCT FROM s.id_external
    ORDER BY s.name`;
};

export const fetchMeasurements = async (
  stationId: number,
  period: Period,
  dateRange?: DateRange | null,
): Promise<Measurement[]> => {
  const sql = await connectDb();
  if (dateRange) {
    return sql<Measurement[]>`
      SELECT ts, water_level_cm, discharge_m3s
      FROM measurement
      WHERE station_id = ${stationId}
        AND ts >= ${dateRange.from}::timestamptz
        AND ts < ${dateRange.to}::timestamptz
      ORDER BY ts ASC`;
  }
  const hours = periodToHours(period);
  return sql<Measurement[]>`
    SELECT ts, water_level_cm, discharge_m3s
    FROM measurement
    WHERE station_id = ${stationId}
      AND ts >= NOW() - make_interval(hours => ${hours})
    ORDER BY ts ASC`;
};

export const fetchRivers = async (): Promise<River[]> => {
  const sql = await connectDb();
  return sql<River[]>`
    SELECT
      r.id,
      r.name,
      b.name AS basin_name,
      COUNT(s.id)::int AS station_count,
      (
        SELECT ROUND(AVG(latest.discharge_m3s)::numeric, 2)::float
        FROM station s2
        CROSS JOIN LATERAL (
          SELECT m.discharge_m3s
          FROM measurement m
          WHERE m.station_id = s2.id
            AND m.discharge_m3s IS NOT NULL
          ORDER BY m.ts DESC
          LIMIT 1
        ) latest
        WHERE s2.river_id = r.id AND s2.is_active = true
      ) AS latest_avg_discharge_m3s
    FROM river r
    LEFT JOIN basin b ON b.id = r.basin_id
    JOIN station s ON s.river_id = r.id AND s.is_active = true
    GROUP BY r.id, r.name, b.name
    ORDER BY r.name`;
};

export const fetchRiverById = async (
  id: number,
): Promise<(Pick<River, 'id' | 'name' | 'basin_name' | 'station_count'>) | null> => {
  const sql = await connectDb();
  const rows = await sql<River[]>`
    SELECT
      r.id,
      r.name,
      b.name AS basin_name,
      COUNT(s.id)::int AS station_count
    FROM river r
    LEFT JOIN basin b ON b.id = r.basin_id
    LEFT JOIN station s ON s.river_id = r.id AND s.is_active = true
    WHERE r.id = ${id}
    GROUP BY r.id, r.name, b.name`;
  return rows[0] ?? null;
};

export const fetchRiverMeasurements = async (
  riverId: number,
  granularity: Granularity,
  period: RiverPeriod,
  dateRange?: DateRange | null,
): Promise<Measurement[]> => {
  const sql = await connectDb();

  const bucketExpr =
    granularity === '10min'
      ? sql`date_bin('10 minutes', m.ts, '2000-01-01'::timestamptz)`
      : sql`date_trunc(${granularity}, m.ts)`;

  const whereTime = dateRange
    ? sql`AND m.ts >= ${dateRange.from}::timestamptz AND m.ts < ${dateRange.to}::timestamptz`
    : (() => {
        const hours = riverPeriodToHours(period);
        return hours !== null ? sql`AND m.ts >= NOW() - make_interval(hours => ${hours})` : sql``;
      })();

  return sql<Measurement[]>`
    SELECT
      ${bucketExpr} AS ts,
      ROUND(AVG(m.water_level_cm)::numeric, 1)::float AS water_level_cm,
      ROUND(AVG(m.discharge_m3s)::numeric, 2)::float AS discharge_m3s
    FROM measurement m
    JOIN station s ON s.id = m.station_id
    WHERE s.river_id = ${riverId}
      AND s.is_active = true
      ${whereTime}
    GROUP BY 1
    ORDER BY 1 ASC`;
};

interface StatsRow {
  wl_min: number | null;
  wl_max: number | null;
  wl_avg: number | null;
  wl_median: number | null;
  wl_max_change: number | null;
  q_min: number | null;
  q_max: number | null;
  q_avg: number | null;
  q_median: number | null;
  q_max_change: number | null;
}

const parseStatsRow = (row: StatsRow | undefined): MeasurementStats => {
  if (!row) return { water_level_cm: null, discharge_m3s: null };

  const buildValueStats = (
    min: number | null,
    max: number | null,
    avg: number | null,
    median: number | null,
    maxChange: number | null,
  ): ValueStats | null => {
    if (min === null || max === null || avg === null || median === null) return null;
    return { min, max, avg, median, max_change: maxChange };
  };

  return {
    water_level_cm: buildValueStats(
      row.wl_min,
      row.wl_max,
      row.wl_avg,
      row.wl_median,
      row.wl_max_change,
    ),
    discharge_m3s: buildValueStats(
      row.q_min,
      row.q_max,
      row.q_avg,
      row.q_median,
      row.q_max_change,
    ),
  };
};

export const fetchMeasurementStats = async (
  stationId: number,
  period: Period,
  dateRange?: DateRange | null,
): Promise<MeasurementStats> => {
  const sql = await connectDb();

  const whereTime = dateRange
    ? sql`AND ts >= ${dateRange.from}::timestamptz AND ts < ${dateRange.to}::timestamptz`
    : (() => {
        const hours = periodToHours(period);
        return sql`AND ts >= NOW() - make_interval(hours => ${hours})`;
      })();

  const rows = await sql<StatsRow[]>`
    WITH filtered AS (
      SELECT ts, water_level_cm, discharge_m3s
      FROM measurement
      WHERE station_id = ${stationId}
        ${whereTime}
    ),
    changes AS (
      SELECT
        ABS(water_level_cm - LAG(water_level_cm) OVER (ORDER BY ts)) AS wl_diff,
        ABS(discharge_m3s - LAG(discharge_m3s) OVER (ORDER BY ts)) AS q_diff
      FROM filtered
    )
    SELECT
      MIN(f.water_level_cm)::float AS wl_min,
      MAX(f.water_level_cm)::float AS wl_max,
      ROUND(AVG(f.water_level_cm)::numeric, 1)::float AS wl_avg,
      (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY f.water_level_cm))::float AS wl_median,
      MAX(c.wl_diff)::float AS wl_max_change,
      MIN(f.discharge_m3s)::float AS q_min,
      MAX(f.discharge_m3s)::float AS q_max,
      ROUND(AVG(f.discharge_m3s)::numeric, 2)::float AS q_avg,
      (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY f.discharge_m3s))::float AS q_median,
      MAX(c.q_diff)::float AS q_max_change
    FROM filtered f, changes c`;
  return parseStatsRow(rows[0]);
};

export const fetchRiverMeasurementStats = async (
  riverId: number,
  granularity: Granularity,
  period: RiverPeriod,
  dateRange?: DateRange | null,
): Promise<MeasurementStats> => {
  const sql = await connectDb();

  const bucketExpr =
    granularity === '10min'
      ? sql`date_bin('10 minutes', m.ts, '2000-01-01'::timestamptz)`
      : sql`date_trunc(${granularity}, m.ts)`;

  const whereTime = dateRange
    ? sql`AND m.ts >= ${dateRange.from}::timestamptz AND m.ts < ${dateRange.to}::timestamptz`
    : (() => {
        const hours = riverPeriodToHours(period);
        return hours !== null ? sql`AND m.ts >= NOW() - make_interval(hours => ${hours})` : sql``;
      })();

  const rows = await sql<StatsRow[]>`
    WITH bucketed AS (
      SELECT
        ${bucketExpr} AS bucket,
        ROUND(AVG(m.water_level_cm)::numeric, 1)::float AS water_level_cm,
        ROUND(AVG(m.discharge_m3s)::numeric, 2)::float AS discharge_m3s
      FROM measurement m
      JOIN station s ON s.id = m.station_id
      WHERE s.river_id = ${riverId}
        AND s.is_active = true
        ${whereTime}
      GROUP BY 1
    ),
    changes AS (
      SELECT
        ABS(water_level_cm - LAG(water_level_cm) OVER (ORDER BY bucket)) AS wl_diff,
        ABS(discharge_m3s - LAG(discharge_m3s) OVER (ORDER BY bucket)) AS q_diff
      FROM bucketed
    )
    SELECT
      MIN(b.water_level_cm)::float AS wl_min,
      MAX(b.water_level_cm)::float AS wl_max,
      ROUND(AVG(b.water_level_cm)::numeric, 1)::float AS wl_avg,
      (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY b.water_level_cm))::float AS wl_median,
      MAX(c.wl_diff)::float AS wl_max_change,
      MIN(b.discharge_m3s)::float AS q_min,
      MAX(b.discharge_m3s)::float AS q_max,
      ROUND(AVG(b.discharge_m3s)::numeric, 2)::float AS q_avg,
      (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY b.discharge_m3s))::float AS q_median,
      MAX(c.q_diff)::float AS q_max_change
    FROM bucketed b, changes c`;
  return parseStatsRow(rows[0]);
};

// ── Availability ───────────────────────────────────────────────────────

export const fetchStationAvailability = async (stationId: number) => {
  const sql = await connectDb();
  return sql<{ year: number; month: number }[]>`
    SELECT DISTINCT
      EXTRACT(YEAR FROM ts)::int AS year,
      EXTRACT(MONTH FROM ts)::int AS month
    FROM measurement
    WHERE station_id = ${stationId}
    ORDER BY 1, 2`;
};

export const fetchStationAvailableDays = async (
  stationId: number,
  year: number,
  month: number,
) => {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const toMonth = month === 12 ? 1 : month + 1;
  const toYear = month === 12 ? year + 1 : year;
  const to = `${toYear}-${String(toMonth).padStart(2, '0')}-01`;
  const sql = await connectDb();
  const rows = await sql<{ day: number }[]>`
    SELECT DISTINCT EXTRACT(DAY FROM ts)::int AS day
    FROM measurement
    WHERE station_id = ${stationId}
      AND ts >= ${from}::timestamptz
      AND ts < ${to}::timestamptz
    ORDER BY 1`;
  return rows.map((r) => r.day);
};

export const fetchRiverAvailability = async (riverId: number) => {
  const sql = await connectDb();
  return sql<{ year: number; month: number }[]>`
    SELECT DISTINCT
      EXTRACT(YEAR FROM m.ts)::int AS year,
      EXTRACT(MONTH FROM m.ts)::int AS month
    FROM measurement m
    JOIN station s ON s.id = m.station_id
    WHERE s.river_id = ${riverId}
      AND s.is_active = true
    ORDER BY 1, 2`;
};

export const fetchRiverAvailableDays = async (
  riverId: number,
  year: number,
  month: number,
) => {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const toMonth = month === 12 ? 1 : month + 1;
  const toYear = month === 12 ? year + 1 : year;
  const to = `${toYear}-${String(toMonth).padStart(2, '0')}-01`;
  const sql = await connectDb();
  const rows = await sql<{ day: number }[]>`
    SELECT DISTINCT EXTRACT(DAY FROM m.ts)::int AS day
    FROM measurement m
    JOIN station s ON s.id = m.station_id
    WHERE s.river_id = ${riverId}
      AND s.is_active = true
      AND m.ts >= ${from}::timestamptz
      AND m.ts < ${to}::timestamptz
    ORDER BY 1`;
  return rows.map((r) => r.day);
};
