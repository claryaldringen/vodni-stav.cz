import { NextRequest, NextResponse } from 'next/server';
import { fetchStationAvailability, fetchStationAvailableDays } from '@/src/lib/queries';

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const stationId = Number(id);
  if (Number.isNaN(stationId)) {
    return NextResponse.json({ error: 'Neplatné ID stanice.' }, { status: 400 });
  }

  const yearParam = request.nextUrl.searchParams.get('year');
  const monthParam = request.nextUrl.searchParams.get('month');

  if (yearParam && monthParam) {
    const year = Number(yearParam);
    const month = Number(monthParam);
    if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Neplatný rok nebo měsíc.' }, { status: 400 });
    }
    const days = await fetchStationAvailableDays(stationId, year, month);
    return NextResponse.json(
      { days },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } },
    );
  }

  const yearMonths = await fetchStationAvailability(stationId);
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
