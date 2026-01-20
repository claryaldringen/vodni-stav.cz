import { NextResponse } from 'next/server';
import { connectDb, closeDb } from '@/src/lib/db';
import { ingestNowMeasurements, runDiscoverIfNeeded } from '@/scripts/ingest/chmi';
import { recordRunFinish, recordRunStart } from '@/scripts/ingest/utils';

export const runtime = 'nodejs';

// 15s ti stačí i bez tohohle, ale nech to tam pro klid.
// maxDuration jde konfigurovat na platformě (a/nebo v route configu dle verze).
export const maxDuration = 60;

const assertCronAuth = (req: Request)=> {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error('CRON_SECRET is not set');

  // jednoduchý shared-secret
  if (req.headers.get('x-cron-secret') !== secret) throw new Error('Unauthorized');
}

export const GET= async (req: Request) => {
  try {
    assertCronAuth(req);

    const db = await connectDb();
    try {
      const discover = await runDiscoverIfNeeded(db);

      const runId = await recordRunStart(db, 'ingest');
      try {
        const now = await ingestNowMeasurements(db);
        await recordRunFinish(db, runId, 'ok', now);
        return NextResponse.json({ ok: true, discover, ...now });
      } catch (e: any) {
        await recordRunFinish(db, runId, 'error', { error: String(e?.message ?? e) });
        throw e;
      }
    } finally {
      await closeDb(db);
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
