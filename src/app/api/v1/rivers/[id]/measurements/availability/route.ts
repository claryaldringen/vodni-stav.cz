import { NextRequest, NextResponse } from 'next/server';
import {
  fetchRiverAvailability,
  fetchRiverAvailableDays,
  fetchRiverById,
} from '@/src/lib/queries';
import { requireApiKey, handleOptions, withCors } from '@/src/lib/api/middleware';
import { apiError } from '@/src/lib/api/errors';
import { mockRiverAvailability } from '@/src/lib/api/mock-data';

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

  const yearParam = request.nextUrl.searchParams.get('year');
  const monthParam = request.nextUrl.searchParams.get('month');

  if (authResult.mode === 'test') {
    const mock = mockRiverAvailability(riverId, yearParam, monthParam);
    if (!mock) return withCors(apiError('Tok nenalezen.', 404));
    return withCors(
      NextResponse.json({ data: mock }, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
      }),
    );
  }

  const river = await fetchRiverById(riverId);
  if (!river) {
    return withCors(apiError('Tok nenalezen.', 404));
  }

  if (yearParam && monthParam) {
    const year = Number(yearParam);
    const month = Number(monthParam);
    if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
      return withCors(apiError('Neplatný rok nebo měsíc.', 400));
    }
    const days = await fetchRiverAvailableDays(riverId, year, month);
    return withCors(
      NextResponse.json({ data: { days } }, {
        headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
      }),
    );
  }

  const yearMonths = await fetchRiverAvailability(riverId);
  const years = [...new Set(yearMonths.map((r) => r.year))];
  const months: Record<number, number[]> = {};
  for (const { year, month } of yearMonths) {
    (months[year] ??= []).push(month);
  }

  return withCors(
    NextResponse.json({ data: { years, months } }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    }),
  );
};
