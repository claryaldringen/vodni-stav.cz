import { NextRequest, NextResponse } from 'next/server';
import { fetchRiverById, fetchRiverMeasurements, fetchRiverMeasurementStats } from '@/src/lib/queries';
import { isValidGranularity, isValidPeriodForGranularity } from '@/src/lib/granularity';
import { parseDateRange } from '@/src/lib/date-range';
import type { Granularity, RiverPeriod } from '@/src/lib/types';

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const riverId = Number(id);
  if (Number.isNaN(riverId)) {
    return NextResponse.json({ error: 'Neplatné ID toku.' }, { status: 400 });
  }

  const fromParam = request.nextUrl.searchParams.get('from');
  const toParam = request.nextUrl.searchParams.get('to');
  const dateRange = parseDateRange(fromParam, toParam);

  if ((fromParam || toParam) && !dateRange) {
    return NextResponse.json({ error: 'Neplatný rozsah dat (from/to).' }, { status: 400 });
  }

  const granularityParam = request.nextUrl.searchParams.get('granularity') ?? 'hour';
  if (!isValidGranularity(granularityParam)) {
    return NextResponse.json({ error: 'Neplatná granularita.' }, { status: 400 });
  }
  const granularity: Granularity = granularityParam;

  const periodParam = request.nextUrl.searchParams.get('period') ?? '3d';
  if (!dateRange && !isValidPeriodForGranularity(granularity, periodParam)) {
    return NextResponse.json({ error: 'Neplatné období pro tuto granularitu.' }, { status: 400 });
  }
  const period = periodParam as RiverPeriod;

  const river = await fetchRiverById(riverId);
  if (!river) {
    return NextResponse.json({ error: 'Tok nenalezen.' }, { status: 404 });
  }

  const [measurements, stats] = await Promise.all([
    fetchRiverMeasurements(riverId, granularity, period, dateRange),
    fetchRiverMeasurementStats(riverId, granularity, period, dateRange),
  ]);
  return NextResponse.json(
    {
      measurements,
      granularity,
      period,
      stats,
      ...(dateRange && { from: dateRange.from, to: dateRange.to }),
    },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } },
  );
};
