import { NextRequest, NextResponse } from 'next/server';
import { fetchRiverById } from '@/src/lib/queries';
import { requireApiKey, handleOptions, withCors } from '@/src/lib/api/middleware';
import { apiError } from '@/src/lib/api/errors';
import { apiSuccess } from '@/src/lib/api/responses';
import { mockRiver } from '@/src/lib/api/mock-data';

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

  if (authResult.mode === 'test') {
    const river = mockRiver(riverId);
    if (!river) return withCors(apiError('Tok nenalezen.', 404));
    return withCors(apiSuccess(river));
  }

  const river = await fetchRiverById(riverId);
  if (!river) {
    return withCors(apiError('Tok nenalezen.', 404));
  }

  return withCors(apiSuccess(river));
};
