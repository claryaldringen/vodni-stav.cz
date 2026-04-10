import { connectDb } from '@/src/lib/db';
import { discoverHistoricalFiles, ingestHistoricalBatch } from '@/scripts/ingest/chmi';
import { recordRunFinish, recordRunStart } from '@/scripts/ingest/utils';
import { withRetry } from './retry';

const DEFAULT_HISTORICAL_DAILY = 'https://opendata.chmi.cz/hydrology/historical/data/daily/';
const BATCH_SIZE = 50;

const log = (...args: unknown[]) => {
  console.log(new Date().toISOString(), '[historical-ingest]', ...args);
};

const main = async () => {
  log('start');
  const db = await connectDb();
  const baseUrl = process.env.CHMI_HISTORICAL_DAILY ?? DEFAULT_HISTORICAL_DAILY;

  const allFiles = await discoverHistoricalFiles(baseUrl);
  log('discovered files:', allFiles.length);

  const currentYear = new Date().getFullYear();

  // Zjistit existujici data — kolik dni mame pro kazdy station+rok
  const existing = await db<{ ext_id: string; yr: number; day_count: number }[]>`
    SELECT
      s.id_external AS ext_id,
      EXTRACT(YEAR FROM m.ts)::INT AS yr,
      COUNT(DISTINCT m.ts::DATE)::INT AS day_count
    FROM measurement m
    JOIN station s ON s.id = m.station_id
    WHERE m.source = 'chmi_daily'
    GROUP BY s.id_external, EXTRACT(YEAR FROM m.ts)
  `;

  const dataMap = new Map<string, number>();
  for (const r of existing) {
    dataMap.set(`${r.ext_id}_${r.yr}`, r.day_count);
  }

  // Rozdelit na gap-fill (neuplna data) a backfill (zadna data)
  const gapFill: typeof allFiles = [];
  const backfill: typeof allFiles = [];

  for (const f of allFiles) {
    const key = `${f.stationExtId}_${f.year}`;
    const dayCount = dataMap.get(key);

    if (dayCount === undefined) {
      backfill.push(f);
    } else if (f.year === currentYear) {
      gapFill.push(f);
    } else {
      const daysInYear =
        f.year % 4 === 0 && (f.year % 100 !== 0 || f.year % 400 === 0) ? 366 : 365;
      if (dayCount < daysInYear * 0.9) {
        gapFill.push(f);
      }
    }
  }

  gapFill.sort((a, b) => b.year - a.year);
  backfill.sort((a, b) => b.year - a.year);

  const pending = [...gapFill, ...backfill];
  log(
    'pending files:',
    pending.length,
    `(gap-fill: ${gapFill.length}, backfill: ${backfill.length})`,
  );

  if (pending.length === 0) {
    log('all done, nothing to ingest');
    process.exit(0);
  }

  // Nacist mapovani ext_id -> station.id
  const extIds = [...new Set(pending.map((f) => f.stationExtId))];
  const stationRows = await db`
    SELECT id, id_external FROM station WHERE id_external = ANY(${extIds}::TEXT[])
  `;
  const stationIdByExt = new Map<string, number>();
  for (const r of stationRows) {
    stationIdByExt.set(r.id_external as string, r.id as number);
  }

  // Zpracovat po davkach
  const runId = await recordRunStart(db, 'historical');
  let totalUpserted = 0;
  const allErrors: string[] = [];

  try {
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(pending.length / BATCH_SIZE);

      log(`batch ${batchNum}/${totalBatches} (${batch.length} files)`);

      const result = await withRetry(
        () => ingestHistoricalBatch(db, baseUrl, batch, stationIdByExt),
        3,
      );

      totalUpserted += result.upserted;
      allErrors.push(...result.errors);
      log(`batch ${batchNum} done: upserted=${result.upserted}, errors=${result.errors.length}`);
    }

    const summary = { totalUpserted, totalErrors: allErrors.length, filesProcessed: pending.length };
    await recordRunFinish(db, runId, 'ok', summary);
    log('done:', summary);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await recordRunFinish(db, runId, 'error', { error: msg, totalUpserted, totalErrors: allErrors.length });
    log('FAILED:', msg);
    process.exit(1);
  }

  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
