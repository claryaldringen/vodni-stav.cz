import { NextResponse } from 'next/server';
import { fetchStations } from '@/src/lib/queries';
import { apiError } from '@/src/lib/api/errors';

export const GET = async () => {
  try {
    const stations = await fetchStations();
    return NextResponse.json(
      { stations },
      { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' } },
    );
  } catch {
    return apiError('Interní chyba serveru.', 500);
  }
};
