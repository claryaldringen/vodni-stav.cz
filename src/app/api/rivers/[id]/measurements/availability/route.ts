import { NextRequest, NextResponse } from 'next/server';
import { fetchRiverAvailability, fetchRiverAvailableDays } from '@/src/lib/queries';

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const riverId = Number(id);
  if (Number.isNaN(riverId)) {
    return NextResponse.json({ error: 'Neplatné ID toku.' }, { status: 400 });
  }

  const yearParam = request.nextUrl.searchParams.get('year');
  const monthParam = request.nextUrl.searchParams.get('month');

  if (yearParam && monthParam) {
    const year = Number(yearParam);
    const month = Number(monthParam);
    if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Neplatný rok nebo měsíc.' }, { status: 400 });
    }
    const days = await fetchRiverAvailableDays(riverId, year, month);
    return NextResponse.json(
      { days },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } },
    );
  }

  const yearMonths = await fetchRiverAvailability(riverId);
  const years = [...new Set(yearMonths.map((r) => r.year))];
  const months: Record<number, number[]> = {};
  for (const { year, month } of yearMonths) {
    (months[year] ??= []).push(month);
  }

  return NextResponse.json(
    { years, months },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } },
  );
};
