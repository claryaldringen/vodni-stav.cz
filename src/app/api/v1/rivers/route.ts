import { NextRequest, NextResponse } from 'next/server';
import { fetchRivers } from '@/src/lib/queries';
import { requireApiKey, handleOptions, withCors } from '@/src/lib/api/middleware';
import { apiSuccess } from '@/src/lib/api/responses';
import { mockRivers } from '@/src/lib/api/mock-data';

export const OPTIONS = () => handleOptions();

export const GET = async (request: NextRequest) => {
  const authResult = await requireApiKey(request);
  if (authResult instanceof NextResponse) return authResult;

  if (authResult.mode === 'test') {
    const rivers = mockRivers();
    return withCors(apiSuccess(rivers, { count: rivers.length }));
  }

  const rivers = await fetchRivers();
  return withCors(apiSuccess(rivers, { count: rivers.length }));
};
