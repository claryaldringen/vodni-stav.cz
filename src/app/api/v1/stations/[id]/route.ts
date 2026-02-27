import { NextRequest, NextResponse } from 'next/server';
import { fetchStationById } from '@/src/lib/queries';
import { requireApiKey, handleOptions, withCors } from '@/src/lib/api/middleware';
import { apiError } from '@/src/lib/api/errors';
import { apiSuccess } from '@/src/lib/api/responses';
import { mockStation } from '@/src/lib/api/mock-data';

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

  if (authResult.mode === 'test') {
    const station = mockStation(stationId);
    if (!station) return withCors(apiError('Stanice nenalezena.', 404));
    return withCors(apiSuccess(station));
  }

  const station = await fetchStationById(stationId);
  if (!station) {
    return withCors(apiError('Stanice nenalezena.', 404));
  }

  return withCors(apiSuccess(station));
};
