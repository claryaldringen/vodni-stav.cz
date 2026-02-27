import { NextResponse } from 'next/server';
import { fetchStations } from '@/src/lib/queries';

export const GET = async () => {
  const stations = await fetchStations();
  return NextResponse.json({ stations });
};
