import { connectDb } from '@/src/lib/db';
import { ingestNowMeasurements, runDiscoverIfNeeded } from '@/scripts/ingest/chmi';
import { recordRunFinish, recordRunStart } from '@/scripts/ingest/utils';
import { withRetry } from './retry';

const log = (...args: unknown[]) => {
  console.log(new Date().toISOString(), '[daily-ingest]', ...args);
};

const main = async () => {
  log('start');
  const db = await connectDb();

  const discover = await runDiscoverIfNeeded(db);
  if (discover.skipped) log('discover skipped');
  else log('discover done:', discover.details);

  const runId = await recordRunStart(db, 'ingest');

  try {
    const result = await withRetry(
      () => ingestNowMeasurements(db),
      3,
    );
    await recordRunFinish(db, runId, 'ok', result);
    log('done:', result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await recordRunFinish(db, runId, 'error', { error: msg });
    log('FAILED:', msg);
    process.exit(1);
  }

  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
