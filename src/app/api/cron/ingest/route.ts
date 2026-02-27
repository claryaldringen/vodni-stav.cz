import { NextResponse } from 'next/server';
import { inngest } from '@/src/inngest/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const isAuthorized = (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
};

export const GET = async (req: Request) => {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  await inngest.send({ name: 'ingest/manual' });

  return NextResponse.json({ ok: true, triggered: true });
};
