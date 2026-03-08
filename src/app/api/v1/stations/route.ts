import { NextRequest, NextResponse } from 'next/server';
import { fetchStations } from '@/src/lib/queries';
import { requireApiKey, handleOptions, withCors } from '@/src/lib/api/middleware';
import { apiSuccess } from '@/src/lib/api/responses';
import { mockStations } from '@/src/lib/api/mock-data';

export const OPTIONS = () => handleOptions();

export const GET = async (request: NextRequest) => {
  const authResult = await requireApiKey(request);
  if (authResult instanceof NextResponse) return authResult;

  if (authResult.mode === 'test') {
    const stations = mockStations();
    const res = withCors(apiSuccess(stations, { count: stations.length }));
    res.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
    return res;
  }

  const stations = await fetchStations();
  const res = withCors(apiSuccess(stations, { count: stations.length }));
  res.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  return res;
};
