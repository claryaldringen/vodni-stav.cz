import { inngest } from '@/src/inngest/client';
import { connectDb } from '@/src/lib/db';
import {
  discoverHistoricalFiles,
  ingestHistoricalBatch,
  ingestNowMeasurements,
  runDiscoverIfNeeded,
} from '@/scripts/ingest/chmi';
import { recordRunFinish, recordRunStart } from '@/scripts/ingest/utils';

const DEFAULT_HISTORICAL_DAILY = 'https://opendata.chmi.cz/hydrology/historical/data/daily/';
const HISTORICAL_BATCH_SIZE = 50;

export const dailyIngest = inngest.createFunction(
  {
    id: 'daily-ingest',
    retries: 1,
  },
  [{ cron: 'TZ=UTC 55 23 * * *' }, { event: 'ingest/manual' }],
  async ({ step }) => {
    const discover = await step.run('discover', async () => {
      const db = await connectDb();
      return runDiscoverIfNeeded(db);
    });

    const ingest = await step.run('ingest-measurements', async () => {
      const db = await connectDb();
      const runId = await recordRunStart(db, 'ingest');

      try {
        const result = await ingestNowMeasurements(db);
        await recordRunFinish(db, runId, 'ok', result);
        return result;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        await recordRunFinish(db, runId, 'error', { error: msg });
        throw e;
      }
    });

    return { discover, ingest };
  },
);

export const historicalIngest = inngest.createFunction(
  {
    id: 'historical-ingest',
    retries: 1,
  },
  [{ cron: 'TZ=UTC 0 4 * * *' }, { event: 'ingest/historical' }],
  async ({ step }) => {
    const baseUrl = process.env.CHMI_HISTORICAL_DAILY ?? DEFAULT_HISTORICAL_DAILY;

    const allFiles = await step.run('discover', async () => {
      return discoverHistoricalFiles(baseUrl);
    });

    const pending = await step.run('find-pending', async () => {
      const db = await connectDb();

      // Zjistíme, které station+year kombinace už mají data
      const existing = await db`
        SELECT s.id_external AS ext_id, EXTRACT(YEAR FROM m.ts)::INT AS yr
        FROM measurement m
        JOIN station s ON s.id = m.station_id
        WHERE m.source = 'chmi_daily'
        GROUP BY s.id_external, EXTRACT(YEAR FROM m.ts)
      `;

      const doneSet = new Set(existing.map((r) => `${r.ext_id}_${r.yr}`));

      const pendingFiles = allFiles.filter(
        (f) => !doneSet.has(`${f.stationExtId}_${f.year}`),
      );

      return pendingFiles.slice(0, HISTORICAL_BATCH_SIZE);
    });

    if (pending.length === 0) {
      return { status: 'all_done', totalFiles: allFiles.length };
    }

    const result = await step.run('ingest-batch', async () => {
      const db = await connectDb();
      const runId = await recordRunStart(db, 'historical');

      try {
        // Načteme mapování ext_id → station.id
        const extIds = [...new Set(pending.map((f) => f.stationExtId))];
        const stationRows = await db`
          SELECT id, id_external FROM station WHERE id_external = ANY(${extIds}::TEXT[])
        `;
        const stationIdByExt = new Map<string, number>();
        for (const r of stationRows) {
          stationIdByExt.set(r.id_external as string, r.id as number);
        }

        const res = await ingestHistoricalBatch(db, baseUrl, pending, stationIdByExt);
        await recordRunFinish(db, runId, 'ok', res);
        return res;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        await recordRunFinish(db, runId, 'error', { error: msg });
        throw e;
      }
    });

    // Self-chain: pokud zbývají další soubory, triggernem další run
    const totalPending = allFiles.length - pending.length; // zbytek
    if (totalPending > 0) {
      await step.sendEvent('chain-next-batch', {
        name: 'ingest/historical',
        data: {},
      });
    }

    return { status: 'batch_done', batch: pending.length, remaining: totalPending, result };
  },
);
