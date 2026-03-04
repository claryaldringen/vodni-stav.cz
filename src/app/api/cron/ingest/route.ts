import { NextResponse } from 'next/server';
import { inngest } from '@/src/inngest/client';

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

  await inngest.send({ name: 'ingest/manual' });

  return NextResponse.json({ ok: true, triggered: true });
};
