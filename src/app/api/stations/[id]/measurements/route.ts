import { NextRequest, NextResponse } from 'next/server';
import { fetchMeasurements, fetchMeasurementStats, fetchStationById } from '@/src/lib/queries';
import { PERIODS } from '@/src/lib/periods';
import { parseDateRange } from '@/src/lib/date-range';
import type { Period } from '@/src/lib/types';
import { ingestStationIfStale } from '@/scripts/ingest/chmi';
import { connectDb } from '@/src/lib/db';

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const stationId = Number(id);
  if (Number.isNaN(stationId)) {
    return NextResponse.json({ error: 'Neplatné ID stanice.' }, { status: 400 });
  }

  const fromParam = request.nextUrl.searchParams.get('from');
  const toParam = request.nextUrl.searchParams.get('to');
  const dateRange = parseDateRange(fromParam, toParam);

  if ((fromParam || toParam) && !dateRange) {
    return NextResponse.json({ error: 'Neplatný rozsah dat (from/to).' }, { status: 400 });
  }

  const periodParam = request.nextUrl.searchParams.get('period') ?? '3d';
  const validPeriods = PERIODS.map((p) => p.value);
  if (!dateRange && !validPeriods.includes(periodParam as Period)) {
    return NextResponse.json({ error: 'Neplatné období.' }, { status: 400 });
  }
  const period = periodParam as Period;

  const station = await fetchStationById(stationId);
  if (!station) {
    return NextResponse.json({ error: 'Stanice nenalezena.' }, { status: 404 });
  }

  try {
    const db = await connectDb();
    await ingestStationIfStale(db, stationId);
  } catch {
    // best-effort — vrátíme data z DB i když on-demand ingest selže
  }

  const [measurements, stats] = await Promise.all([
    fetchMeasurements(stationId, period, dateRange),
    fetchMeasurementStats(stationId, period, dateRange),
  ]);
  return NextResponse.json(
    {
      station,
      measurements,
      period,
      stats,
      ...(dateRange && { from: dateRange.from, to: dateRange.to }),
    },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } },
  );
};
