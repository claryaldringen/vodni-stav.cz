import 'dotenv-safe/config';

import { connectDb, closeDb } from '@/src/lib/db';
import { ingestNowMeasurements, runDiscoverIfNeeded } from './chmi.js';
import { recordRunFinish, recordRunStart } from '@/scripts/ingest/utils';

const log = (...args: any[]) => {
  console.log(new Date().toISOString(), ...args);
};

const main = async () => {
  const db = await connectDb();

  try {
    const discover = await runDiscoverIfNeeded(db);
    if (discover.skipped) log('Discover skipped');
    else log('Discover done:', discover.details);

    const runId = await recordRunStart(db, 'ingest');
    try {
      const now = await ingestNowMeasurements(db);
      await recordRunFinish(db, runId, 'ok', now);
      log('Ingest done:', now);
    } catch (e: any) {
      await recordRunFinish(db, runId, 'error', { error: String(e?.message ?? e) });
      throw e;
    }
  } finally {
    await closeDb(db);
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
