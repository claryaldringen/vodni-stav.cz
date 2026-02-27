import { NextRequest, NextResponse } from 'next/server';
import { fetchMeasurements, fetchMeasurementStats, fetchStationById } from '@/src/lib/queries';
import { PERIODS } from '@/src/lib/periods';
import { parseDateRange } from '@/src/lib/date-range';
import { requireApiKey, handleOptions, withCors } from '@/src/lib/api/middleware';
import { apiError } from '@/src/lib/api/errors';
import { apiSuccess } from '@/src/lib/api/responses';
import { mockStation, mockStationMeasurements, mockStationStats } from '@/src/lib/api/mock-data';
import type { Period } from '@/src/lib/types';

export const OPTIONS = () => handleOptions();

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const authResult = await requireApiKey(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const stationId = Number(id);
  if (Number.isNaN(stationId)) {
    return withCors(apiError('Neplatné ID stanice.', 400));
  }

  const fromParam = request.nextUrl.searchParams.get('from');
  const toParam = request.nextUrl.searchParams.get('to');
  const dateRange = parseDateRange(fromParam, toParam);

  if ((fromParam || toParam) && !dateRange) {
    return withCors(apiError('Neplatný rozsah dat (from/to).', 400));
  }

  const periodParam = request.nextUrl.searchParams.get('period') ?? '3d';
  const validPeriods = PERIODS.map((p) => p.value);
  if (!dateRange && !validPeriods.includes(periodParam as Period)) {
    return withCors(apiError('Neplatné období. Povolené: 24h, 3d, 7d, 30d.', 400));
  }
  const period = periodParam as Period;

  if (authResult.mode === 'test') {
    if (!mockStation(stationId)) return withCors(apiError('Stanice nenalezena.', 404));
    const measurements = mockStationMeasurements(period);
    const stats = mockStationStats(period);
    return withCors(
      apiSuccess(measurements, {
        count: measurements.length,
        period,
        stats,
        ...(dateRange && { from: dateRange.from, to: dateRange.to }),
      }),
    );
  }

  const station = await fetchStationById(stationId);
  if (!station) {
    return withCors(apiError('Stanice nenalezena.', 404));
  }

  const [measurements, stats] = await Promise.all([
    fetchMeasurements(stationId, period, dateRange),
    fetchMeasurementStats(stationId, period, dateRange),
  ]);
  return withCors(
    apiSuccess(measurements, {
      count: measurements.length,
      period,
      stats,
      ...(dateRange && { from: dateRange.from, to: dateRange.to }),
    }),
  );
};
