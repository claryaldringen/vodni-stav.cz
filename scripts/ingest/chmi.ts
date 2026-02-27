import { extractStationMetaFromMeta1Row, parseMeta1 } from '@/scripts/ingest/extractors';
import { Db } from '@/src/lib/db';
import { recordRunFinish, recordRunStart } from '@/scripts/ingest/utils';

const DEFAULT_META1 = 'https://opendata.chmi.cz/hydrology/now/metadata/meta1.json';
const DEFAULT_NOW_INDEX = 'https://opendata.chmi.cz/hydrology/now/data/';

export const fetchWithTimeout = async (url: string, ms: number) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
};

const parseIndexHtmlForJsonFiles = (html: string): string[] => {
  const out: string[] = [];
  const re = /href="([^"]+\.json)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(m[1]);
  return Array.from(new Set(out));
};

export const discoverStationsFromNowIndex = async (
  db: Db,
): Promise<{ discoveredStations: number; totalInIndex: number }> => {
  const indexUrl = process.env.CHMI_NOW_INDEX ?? DEFAULT_NOW_INDEX;

  const res = await fetchWithTimeout(indexUrl, 8000);
  if (!res.ok) throw new Error(`now index fetch failed: ${res.status} ${res.statusText}`);

  const html = await res.text();
  const files = parseIndexHtmlForJsonFiles(html);

  const ids = files
    .map((f) => f.replace(/\.json$/i, ''))
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return { discoveredStations: 0, totalInIndex: 0 };
  }

  const q = await db`
    INSERT INTO station (id_external, name, meta, updated_at, is_active)
    SELECT x, 'Stanice ' || x, '{}'::JSONB, NOW(), TRUE
    FROM UNNEST(${ids}::TEXT[]) AS x
    ON CONFLICT (id_external) DO NOTHING
  `;

  return { discoveredStations: q.count, totalInIndex: ids.length };
};

const loadStationExternalIds = async (db: Db): Promise<string[]> => {
  const rows = await db`
    SELECT id_external
    FROM station
    WHERE is_active = TRUE
      AND id_external IS NOT NULL
    ORDER BY id_external
  `;
  return rows.map((r) => r.id_external as string).filter(Boolean);
};

const shouldDiscoverStations = async (db: Db): Promise<boolean> => {
  // 1) prvni beh (zadne stanice)
  const cntRes = await db`SELECT COUNT(*)::INT AS cnt FROM station`;
  const stationCount: number = cntRes[0]?.cnt ?? 0;
  if (stationCount === 0) return true;

  // 2) jestli uz dlouho nebezel discover
  const lastRes = await db`
    SELECT started_at
    FROM ingest_run
    WHERE kind = 'discover'
      AND status = 'ok'
    ORDER BY started_at DESC
    LIMIT 1
  `;

  const last: string | null = lastRes[0]?.started_at ?? null;
  if (!last) return true;

  // 24 hodin
  const lastMs = new Date(last).getTime();
  const nowMs = Date.now();
  return nowMs - lastMs > 24 * 60 * 60 * 1000;
};

export const runDiscoverIfNeeded = async (db: Db) => {
  if (!(await shouldDiscoverStations(db))) return { skipped: true };

  const runId = await recordRunStart(db, 'discover');
  try {
    // 1) Discover stanice z HTML indexu now/data/
    const discovered = await discoverStationsFromNowIndex(db);

    // 2) Refresh metadat z meta1.json (doplní lat/lon/river/name/thresholds)
    const meta = await refreshMetadata(db);

    const details = { ...discovered, ...meta };
    await recordRunFinish(db, runId, 'ok', details);

    return { skipped: false, details };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await recordRunFinish(db, runId, 'error', { error: msg });
    throw e;
  }
};

const getOnlyStationsSet = (): Set<string> | null => {
  const raw = (process.env.ONLY_STATIONS ?? '').trim();
  if (!raw) return null;
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
};

/**
 * meta1.json (header/values) -> river + station
 *
 * POZOR: st.id z extractorů je EXTERNÍ ID (objID) => ukládáme do station.id_external
 */
export const refreshMetadata = async (
  db: Db,
): Promise<{ stationsUpserted: number; riversUpserted: number }> => {
  const url = process.env.CHMI_META1 ?? DEFAULT_META1;

  const res = await fetchWithTimeout(url, 8000);
  if (!res.ok) throw new Error(`meta1 fetch failed: ${res.status} ${res.statusText}`);
  const meta = await res.json();

  const only = getOnlyStationsSet();
  const rows = parseMeta1(meta);

  let stationsUpserted = 0;
  let riversUpserted = 0;

  for (const row of rows) {
    const st = extractStationMetaFromMeta1Row(row);
    if (!st) continue;

    const stationExternalId = st.id;
    if (only && !only.has(stationExternalId)) continue;

    // UPSERT river (UNIQUE(name))
    let riverId: number | null = null;

    if (st.riverName) {
      const riverRes = await db`
        INSERT INTO river (id_external, name, basin_id, meta, updated_at)
        VALUES (NULL, ${st.riverName}, NULL, ${JSON.stringify({})}::jsonb, NOW())
        ON CONFLICT (name) DO UPDATE SET
          updated_at = NOW()
        RETURNING id
      `;

      riverId = riverRes[0]?.id ?? null;
      if (riverId !== null) riversUpserted += 1;
    }

    // UPSERT station (UNIQUE(id_external))
    await db`
      INSERT INTO station (
        id_external,
        code,
        name,
        river_id,
        basin_id,
        operator,
        lat,
        lon,
        elevation_m,
        is_active,
        meta,
        updated_at
      )
      VALUES (
        ${stationExternalId},
        ${st.code},
        ${st.name},
        ${riverId},
        ${null},
        ${null},
        ${st.lat},
        ${st.lon},
        ${null},
        TRUE,
        ${JSON.stringify(st.raw)}::jsonb,
        NOW()
      )
      ON CONFLICT (id_external) DO UPDATE SET
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        river_id = EXCLUDED.river_id,
        lat = EXCLUDED.lat,
        lon = EXCLUDED.lon,
        is_active = TRUE,
        meta = EXCLUDED.meta,
        updated_at = NOW()
    `;

    stationsUpserted += 1;
  }

  return { stationsUpserted, riversUpserted };
};

type MeasurementPoint = {
  ts: string; // ISO UTC
  water_level_cm: number | null; // H
  discharge_m3s: number | null; // Q
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mergeHistoricalTimeseries = (json: any): MeasurementPoint[] => {
  const byTs = new Map<string, { H?: number; Q?: number }>();

  for (const series of json.tsList ?? []) {
    const key = series.tsConID; // 'HD' = denní hladina, 'QD' = denní průtok
    for (const row of series.tsData?.data?.values ?? []) {
      const [dt, value] = row as [string, number];
      if (!byTs.has(dt)) byTs.set(dt, {});
      const cur = byTs.get(dt)!;
      if (key === 'HD') cur.H = value;
      if (key === 'QD') cur.Q = value;
    }
  }

  const points: MeasurementPoint[] = [];
  for (const [ts, v] of byTs.entries()) {
    if (v.H || v.Q) {
      points.push({
        ts,
        water_level_cm: v.H ?? null,
        discharge_m3s: v.Q ?? null,
      });
    }
  }

  points.sort((a, b) => a.ts.localeCompare(b.ts));
  return points;
};

export type HistoricalFileEntry = {
  stationExtId: string;
  year: number;
  filename: string;
};

export const discoverHistoricalFiles = async (baseUrl: string): Promise<HistoricalFileEntry[]> => {
  const res = await fetchWithTimeout(baseUrl, 15000);
  if (!res.ok) throw new Error(`historical index fetch failed: ${res.status}`);
  const html = await res.text();

  const entries: HistoricalFileEntry[] = [];
  const re = /href="(H_([^"]+?)_DQ_(\d{4})\.json)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    entries.push({ filename: m[1], stationExtId: m[2], year: Number(m[3]) });
  }
  return entries;
};

export const ingestHistoricalBatch = async (
  db: Db,
  baseUrl: string,
  files: HistoricalFileEntry[],
  stationIdByExt: Map<string, number>,
): Promise<{ fetched: number; upserted: number; errors: string[] }> => {
  const errors: string[] = [];
  let totalUpserted = 0;

  for (const file of files) {
    const stationId = stationIdByExt.get(file.stationExtId);
    if (stationId == null) {
      errors.push(`No station in DB for ${file.stationExtId}`);
      continue;
    }

    try {
      const url = `${baseUrl}${file.filename}`;
      const res = await fetchWithTimeout(url, 15000);
      if (!res.ok) {
        errors.push(`Fetch ${file.filename}: ${res.status}`);
        continue;
      }

      const json = await res.json();
      const points = mergeHistoricalTimeseries(json);
      if (points.length === 0) continue;

      const result = await db`
        INSERT INTO measurement (station_id, ts, water_level_cm, discharge_m3s, source)
        SELECT x.station_id, x.ts, x.water_level_cm, x.discharge_m3s, x.source
        FROM UNNEST(
          ${points.map(() => stationId)}::BIGINT[],
          ${points.map((p) => p.ts)}::TIMESTAMPTZ[],
          ${points.map((p) => p.water_level_cm ?? null)}::NUMERIC[],
          ${points.map((p) => p.discharge_m3s ?? null)}::NUMERIC[],
          ${points.map(() => 'chmi_daily')}::TEXT[]
        ) AS x(station_id, ts, water_level_cm, discharge_m3s, source)
        ON CONFLICT (ts, station_id) DO UPDATE SET
          water_level_cm = COALESCE(EXCLUDED.water_level_cm, measurement.water_level_cm),
          discharge_m3s  = COALESCE(EXCLUDED.discharge_m3s,  measurement.discharge_m3s),
          source         = EXCLUDED.source
        WHERE
          EXCLUDED.water_level_cm IS DISTINCT FROM measurement.water_level_cm
          OR EXCLUDED.discharge_m3s IS DISTINCT FROM measurement.discharge_m3s
      `;
      totalUpserted += result.count;
    } catch (e: unknown) {
      errors.push(`${file.filename}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { fetched: files.length, upserted: totalUpserted, errors };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mergeTimeseries = (objListItem: any): MeasurementPoint[] => {
  const byTs = new Map<string, { H?: number; Q?: number }>();

  for (const series of objListItem.tsList ?? []) {
    const key = series.tsConID; // 'H' nebo 'Q'
    for (const p of series.tsData ?? []) {
      const ts: string = p.dt;
      if (!byTs.has(ts)) {
        byTs.set(ts, {});
      }
      const cur = byTs.get(ts)!;
      if (key === 'H') cur.H = p.value;
      if (key === 'Q') cur.Q = p.value;
    }
  }

  const points: MeasurementPoint[] = [];
  for (const [ts, v] of byTs.entries()) {
    if (v.H || v.Q) {
      points.push({
        ts,
        water_level_cm: v.H ?? null,
        discharge_m3s: v.Q ?? null,
      });
    }
  }

  points.sort((a, b) => a.ts.localeCompare(b.ts));
  return points;
};

/**
 * 1) Stáhne index adresáře now/data/
 * 2) Projde všechny stanice (nebo ONLY_STATIONS)
 * 3) Upsertne measurements do measurement (PK: station_id + ts)
 */
export const ingestNowMeasurements = async (
  db: Db,
): Promise<{ files: number; rowsToUpsert: number; rowsUpserted: number; errors: string[] }> => {
  const runStartedAt = process.hrtime.bigint();

  const baseUrl = process.env.CHMI_NOW_INDEX ?? DEFAULT_NOW_INDEX; // končí na .../now/data/
  const only = getOnlyStationsSet();

  const msSince = (t0: bigint) => Number((process.hrtime.bigint() - t0) / 1_000_000n);

  const tLoadStations = process.hrtime.bigint();
  // 1) Seznam stanic z DB, ne z HTML indexu
  let stationExternalIds = await loadStationExternalIds(db);
  if (only) {
    stationExternalIds = stationExternalIds.filter((id) => only.has(id));
  }
  console.log('[ingestNow] stations loaded', {
    count: stationExternalIds.length,
    ms: msSince(tLoadStations),
  });

  const tStationMap = process.hrtime.bigint();
  const stationRows = await db`
    SELECT id, id_external
    FROM station
    WHERE id_external = ANY(${stationExternalIds}::text[])
  `;

  const stationIdByExt = new Map<string, number>();
  for (const row of stationRows) {
    stationIdByExt.set(row.id_external as string, row.id as number);
  }
  console.log('[ingestNow] station id map built', {
    rows: stationRows.count,
    ms: msSince(tStationMap),
  });

  const tFetchAll = process.hrtime.bigint();

  const promises = stationExternalIds.map(async (extId) => {
    const url = `${baseUrl}${extId}.json`;
    const res = await fetchWithTimeout(url, 8000);
    if (res.status != 200) {
      return { error: `Fetch of ${url} ends with status ${res.status}.`, rows: [] };
    }
    const json = await res.json();
    const obj = json?.objList?.[0];
    if (obj == null) {
      return { error: `File ${url} has no object.`, rows: [] };
    }
    const points = mergeTimeseries(obj);
    const stationId = stationIdByExt.get(extId) ?? null;
    return {
      error: null,
      rows: points.map((point) => ({
        stationId,
        ...point,
      })),
    };
  });

  const batches = await Promise.all(promises);

  const allRows = batches.map((batch) => batch.rows);
  const errors = batches.map((batch) => batch.error).filter((err) => err != null);
  const toInsert = allRows.flat();

  console.log('[ingestNow] fetch+parse done', {
    toInsert: toInsert.length,
    ms: msSince(tFetchAll),
  });

  const tUpsert = process.hrtime.bigint();
  const queryResult = await db`
    INSERT INTO measurement (
      station_id,
      ts,
      water_level_cm,
      discharge_m3s,
      source
    )
    SELECT
      x.station_id,
      x.ts,
      x.water_level_cm,
      x.discharge_m3s,
      x.source
    FROM UNNEST(
      ${toInsert.map((r) => r.stationId)}::BIGINT[],
      ${toInsert.map((r) => r.ts)}::TIMESTAMPTZ[],
      ${toInsert.map((r) => r.water_level_cm ?? null)}::NUMERIC[],
      ${toInsert.map((r) => r.discharge_m3s ?? null)}::NUMERIC[],
      ${toInsert.map(() => 'chmi_now')}::TEXT[]
    ) AS x(station_id, ts, water_level_cm, discharge_m3s, source)
    ON CONFLICT (ts, station_id) DO UPDATE SET
      water_level_cm = COALESCE(EXCLUDED.water_level_cm, measurement.water_level_cm),
      discharge_m3s  = COALESCE(EXCLUDED.discharge_m3s,  measurement.discharge_m3s),
      source         = EXCLUDED.source
    WHERE
      EXCLUDED.water_level_cm IS DISTINCT FROM measurement.water_level_cm
      OR EXCLUDED.discharge_m3s IS DISTINCT FROM measurement.discharge_m3s
  `;

  const upsertMs = msSince(tUpsert);
  const rowsUpserted = queryResult.count;

  console.log('[ingestNow] upsert done', {
    rowsUpserted,
    ms: upsertMs,
  });

  console.log('[ingestNow] finished', {
    files: stationExternalIds.length,
    rowsUpserted,
    errors,
    totalMs: msSince(runStartedAt),
  });

  return {
    files: stationExternalIds.length,
    rowsToUpsert: toInsert.length,
    rowsUpserted,
    errors,
  };
};

/**
 * On-demand ingest měření jedné stanice.
 * Zkontroluje čerstvost dat v DB — pokud jsou starší než `staleMinutes`,
 * stáhne aktuální data z ČHMÚ a uloží do DB.
 */
export const ingestStationIfStale = async (
  db: Db,
  stationId: number,
  staleMinutes = 15,
): Promise<{ fresh: boolean; upserted?: number }> => {
  // Try advisory lock — if another request is already ingesting this station, skip
  const lockKey = 100000 + stationId; // offset to avoid collisions with other locks
  const [{ locked }] = await db`SELECT pg_try_advisory_xact_lock(${lockKey}) AS locked`;
  if (!locked) {
    return { fresh: true }; // another request is handling it
  }

  const [{ max_ts }] = await db`
    SELECT MAX(ts) AS max_ts FROM measurement WHERE station_id = ${stationId}
  `;

  if (max_ts) {
    const ageMs = Date.now() - new Date(max_ts).getTime();
    if (ageMs < staleMinutes * 60 * 1000) {
      return { fresh: true };
    }
  }

  const rows = await db`
    SELECT id_external FROM station WHERE id = ${stationId}
  `;
  const idExternal: string | null = rows[0]?.id_external ?? null;
  if (!idExternal) return { fresh: false, upserted: 0 };

  const baseUrl = process.env.CHMI_NOW_INDEX ?? DEFAULT_NOW_INDEX;
  const url = `${baseUrl}${idExternal}.json`;

  const res = await fetchWithTimeout(url, 8000);
  if (!res.ok) return { fresh: false, upserted: 0 };

  const json = await res.json();
  const obj = json?.objList?.[0];
  if (!obj) return { fresh: false, upserted: 0 };

  const points = mergeTimeseries(obj);
  if (points.length === 0) return { fresh: false, upserted: 0 };

  const result = await db`
    INSERT INTO measurement (station_id, ts, water_level_cm, discharge_m3s, source)
    SELECT
      x.station_id, x.ts, x.water_level_cm, x.discharge_m3s, x.source
    FROM UNNEST(
      ${points.map(() => stationId)}::BIGINT[],
      ${points.map((p) => p.ts)}::TIMESTAMPTZ[],
      ${points.map((p) => p.water_level_cm ?? null)}::NUMERIC[],
      ${points.map((p) => p.discharge_m3s ?? null)}::NUMERIC[],
      ${points.map(() => 'chmi_now')}::TEXT[]
    ) AS x(station_id, ts, water_level_cm, discharge_m3s, source)
    ON CONFLICT (ts, station_id) DO UPDATE SET
      water_level_cm = COALESCE(EXCLUDED.water_level_cm, measurement.water_level_cm),
      discharge_m3s  = COALESCE(EXCLUDED.discharge_m3s,  measurement.discharge_m3s),
      source         = EXCLUDED.source
    WHERE
      EXCLUDED.water_level_cm IS DISTINCT FROM measurement.water_level_cm
      OR EXCLUDED.discharge_m3s IS DISTINCT FROM measurement.discharge_m3s
  `;

  return { fresh: false, upserted: result.count };
};
