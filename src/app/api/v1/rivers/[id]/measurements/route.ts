import { NextRequest, NextResponse } from 'next/server';
import { fetchRiverById, fetchRiverMeasurements, fetchRiverMeasurementStats } from '@/src/lib/queries';
import { isValidGranularity, isValidPeriodForGranularity } from '@/src/lib/granularity';
import { parseDateRange } from '@/src/lib/date-range';
import { requireApiKey, handleOptions, withCors } from '@/src/lib/api/middleware';
import { apiError } from '@/src/lib/api/errors';
import { apiSuccess } from '@/src/lib/api/responses';
import { mockRiver, mockRiverMeasurements, mockRiverStats } from '@/src/lib/api/mock-data';
import type { Granularity, RiverPeriod } from '@/src/lib/types';

export const OPTIONS = () => handleOptions();

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const authResult = await requireApiKey(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const riverId = Number(id);
  if (Number.isNaN(riverId)) {
    return withCors(apiError('Neplatné ID toku.', 400));
  }

  const fromParam = request.nextUrl.searchParams.get('from');
  const toParam = request.nextUrl.searchParams.get('to');
  const dateRange = parseDateRange(fromParam, toParam);

  if ((fromParam || toParam) && !dateRange) {
    return withCors(apiError('Neplatný rozsah dat (from/to).', 400));
  }

  const granularityParam = request.nextUrl.searchParams.get('granularity') ?? 'hour';
  if (!isValidGranularity(granularityParam)) {
    return withCors(apiError('Neplatná granularita.', 400));
  }
  const granularity: Granularity = granularityParam;

  const periodParam = request.nextUrl.searchParams.get('period') ?? '3d';
  if (!dateRange && !isValidPeriodForGranularity(granularity, periodParam)) {
    return withCors(apiError('Neplatné období pro tuto granularitu.', 400));
  }
  const period = periodParam as RiverPeriod;

  if (authResult.mode === 'test') {
    if (!mockRiver(riverId)) return withCors(apiError('Tok nenalezen.', 404));
    const measurements = mockRiverMeasurements(granularity, period);
    const stats = mockRiverStats(granularity, period);
    return withCors(
      apiSuccess(measurements, {
        count: measurements.length,
        granularity,
        period,
        stats,
        ...(dateRange && { from: dateRange.from, to: dateRange.to }),
      }),
    );
  }

  const river = await fetchRiverById(riverId);
  if (!river) {
    return withCors(apiError('Tok nenalezen.', 404));
  }

  const [measurements, stats] = await Promise.all([
    fetchRiverMeasurements(riverId, granularity, period, dateRange),
    fetchRiverMeasurementStats(riverId, granularity, period, dateRange),
  ]);
  return withCors(
    apiSuccess(measurements, {
      count: measurements.length,
      granularity,
      period,
      stats,
      ...(dateRange && { from: dateRange.from, to: dateRange.to }),
    }),
  );
};
