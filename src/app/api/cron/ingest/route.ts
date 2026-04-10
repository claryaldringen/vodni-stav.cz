import { NextResponse } from 'next/server';
import { connectDb } from '@/src/lib/db';
import { ingestNowMeasurements, runDiscoverIfNeeded } from '@/scripts/ingest/chmi';
import { recordRunFinish, recordRunStart } from '@/scripts/ingest/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const isAuthorized = (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;

  if (auth.length !== expected.length) return false;

  const a = new TextEncoder().encode(auth);
  const b = new TextEncoder().encode(expected);
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
};

export const GET = async (req: Request) => {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const db = await connectDb();

  await runDiscoverIfNeeded(db);

  const runId = await recordRunStart(db, 'ingest');
  try {
    const result = await ingestNowMeasurements(db);
    await recordRunFinish(db, runId, 'ok', result);
    return NextResponse.json({ ok: true, result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await recordRunFinish(db, runId, 'error', { error: msg });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
};
