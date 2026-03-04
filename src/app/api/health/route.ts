import { NextResponse } from 'next/server';
import { connectDb } from '@/src/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = async () => {
  const checks: Record<string, 'ok' | 'error'> = {};

  try {
    const sql = await connectDb();
    await sql`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  const healthy = Object.values(checks).every((v) => v === 'ok');

  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', checks },
    { status: healthy ? 200 : 503 },
  );
};
