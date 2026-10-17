import { NextRequest, NextResponse } from 'next/server';
import { fetchLatestMeasurement, fetchNearestStation } from '@/src/lib/queries';
import { apiError } from '@/src/lib/api/errors';
import { parseCoordinates } from '@/src/lib/geo';
import { slugify } from '@/src/lib/slug';
import { getStationStage } from '@/src/lib/station-limits';
import { ingestStationIfStale } from '@/scripts/ingest/chmi';
import { connectDb } from '@/src/lib/db';
import type { NearestResult } from '@/src/lib/types';

// Dál od hranic už „nejbližší stanice“ nedává smysl
const MAX_DISTANCE_KM = 100;

export const GET = async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  const coordinates = parseCoordinates(searchParams.get('lat'), searchParams.get('lon'));
  if (!coordinates) {
    return apiError('Neplatné souřadnice.', 400);
  }
  const kind = searchParams.get('kind') === 'river' ? 'river' : 'station';

  try {
    const station = await fetchNearestStation(coordinates.lat, coordinates.lon, kind === 'river');
    if (!station || station.distance_km > MAX_DISTANCE_KM) {
      return NextResponse.json({ nearest: null });
    }

    try {
      const db = await connectDb();
      await ingestStationIfStale(db, station.id);
    } catch {
      // best-effort — vrátíme data z DB i když on-demand ingest selže
    }

    const latest = await fetchLatestMeasurement(station.id);
    const nearest: NearestResult = {
      distanceKm: station.distance_km,
      station: { name: station.name, href: `/stanice/${slugify(station.name)}` },
      river: station.river_name
        ? { name: station.river_name, href: `/toky/${slugify(station.river_name)}` }
        : null,
      latest,
      stage: latest ? getStationStage(station.meta, latest) : null,
    };

    return NextResponse.json({ nearest }, { headers: { 'Cache-Control': 'private, max-age=300' } });
  } catch {
    return apiError('Interní chyba serveru.', 500);
  }
};
