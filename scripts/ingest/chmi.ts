import { extractStationMetaFromMeta1Row, parseMeta1 } from '@/scripts/ingest/extractors';
import { Db } from '@/src/lib/db';
import { recordRunFinish, recordRunStart } from '@/scripts/ingest/utils';

const DEFAULT_META1 = 'https://opendata.chmi.cz/hydrology/now/metadata/meta1.json';
const DEFAULT_NOW_INDEX = 'https://opendata.chmi.cz/hydrology/now/data/';

const fetchWithTimeout = async (url: string, ms: number) => {
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

  const q = await db.query(
    `
    INSERT INTO station (id_external, name, meta, updated_at, is_active)
    SELECT x, x, '{}'::JSONB, NOW(), TRUE
    FROM UNNEST($1::TEXT[]) AS x
    ON CONFLICT (id_external) DO NOTHING
    `,
    [ids],
  );

  return { discoveredStations: q.rowCount ?? 0, totalInIndex: ids.length };
};

const loadStationExternalIds = async (db: Db): Promise<string[]> => {
  const res = await db.query(
    `
    SELECT id_external
    FROM station
    WHERE is_active = TRUE
      AND id_external IS NOT NULL
    ORDER BY id_external
    `,
    [],
  );
  return res.rows.map((r) => r.id_external).filter(Boolean);
};

const shouldDiscoverStations = async (db: Db): Promise<boolean> => {
  // 1) prvni beh (zadne stanice)
  const cntRes = await db.query('SELECT COUNT(*)::INT AS cnt FROM station');
  const stationCount: number = cntRes.rows[0]?.cnt ?? 0;
  if (stationCount === 0) return true;

  // 2) jestli uz dlouho nebezel discover
  const lastRes = await db.query(
    `
    SELECT started_at
    FROM ingest_run
    WHERE kind = 'discover'
      AND status = 'ok'
    ORDER BY started_at DESC
    LIMIT 1
    `,
  );

  const last: string | null = lastRes.rows[0]?.started_at ?? null;
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
  } catch (e: any) {
    await recordRunFinish(db, runId, 'error', { error: String(e?.message ?? e) });
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
      const riverRes = await db.query(
        `
                    INSERT INTO river (id_external, name, basin_id, meta, updated_at)
                    VALUES (NULL, $1, NULL, $2, NOW())
                    ON CONFLICT (name) DO UPDATE SET
                        updated_at = NOW()
                    RETURNING id
                `,
        [st.riverName, {}],
      );

      riverId = riverRes.rows[0]?.id ?? null;
      if (riverId !== null) riversUpserted += 1;
    }

    // UPSERT station (UNIQUE(id_external))
    await db.query(
      `
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
                           $1,
                           $2,
                           $3,
                           $4,
                           NULL,
                           NULL,
                           $5,
                           $6,
                           NULL,
                           TRUE,
                           $7,
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
            `,
      [stationExternalId, st.code, st.name, riverId, st.lat, st.lon, st.raw],
    );

    stationsUpserted += 1;
  }

  return { stationsUpserted, riversUpserted };
};

type MeasurementPoint = {
  ts: string; // ISO UTC
  water_level_cm: number | null; // H
  discharge_m3s: number | null; // Q
};

const mergeTimeseries = (objListItem: any): MeasurementPoint[] => {
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

  const rows: MeasurementPoint[] = [];
  for (const [ts, v] of byTs.entries()) {
    if (v.H || v.Q) {
      rows.push({
        ts,
        water_level_cm: v.H ?? null,
        discharge_m3s: v.Q ?? null,
      });
    }
  }

  rows.sort((a, b) => a.ts.localeCompare(b.ts));
  return rows;
};

/**
 * 1) Stáhne index adresáře now/data/
 * 2) Projde všechny stanice (nebo ONLY_STATIONS)
 * 3) Upsertne measurements do measurement (PK: station_id + ts)
 */
export const ingestNowMeasurements = async (
  db: Db,
): Promise<{ files: number; rowsToUpsert: number, rowsUpserted: number; errors: string[] }> => {
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
  const stationRows = await db.query(
    `
    SELECT id, id_external
    FROM station
    WHERE id_external = ANY($1::text[])
    `,
    [stationExternalIds],
  );

  const stationIdByExt = new Map<string, number>();
  for (const row of stationRows.rows) {
    stationIdByExt.set(row.id_external, row.id);
  }
  console.log('[ingestNow] station id map built', {
    rows: stationRows.rowCount ?? stationRows.rows.length,
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
  const queryResult = await db.query(
    `
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
      $1::BIGINT[],
      $2::TIMESTAMPTZ[],
      $3::NUMERIC[],
      $4::NUMERIC[],
      $5::TEXT[]
    ) AS x(station_id, ts, water_level_cm, discharge_m3s, source)
    ON CONFLICT (ts, station_id) DO UPDATE SET
      water_level_cm = COALESCE(EXCLUDED.water_level_cm, measurement.water_level_cm),
      discharge_m3s  = COALESCE(EXCLUDED.discharge_m3s,  measurement.discharge_m3s),
      source         = EXCLUDED.source
    WHERE
      EXCLUDED.water_level_cm IS DISTINCT FROM measurement.water_level_cm
      OR EXCLUDED.discharge_m3s IS DISTINCT FROM measurement.discharge_m3s
    `,
    [
      toInsert.map((r) => r.stationId),
      toInsert.map((r) => r.ts),
      toInsert.map((r) => r.water_level_cm ?? null),
      toInsert.map((r) => r.discharge_m3s ?? null),
      toInsert.map(() => 'chmi_now'),
    ],
  );

  const upsertMs = msSince(tUpsert);
  const rowsUpserted = queryResult.rowCount ?? 0;

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
