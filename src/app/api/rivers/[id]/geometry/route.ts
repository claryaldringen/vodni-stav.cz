import { NextResponse } from 'next/server';
import { connectDb } from '@/src/lib/db';

interface OverpassElement {
  type: string;
  geometry?: { lat: number; lon: number }[];
  members?: { type: string; geometry?: { lat: number; lon: number }[]; role: string }[];
}

interface OverpassResponse {
  elements: OverpassElement[];
}

const parseOverpassToGeoJSON = (data: OverpassResponse) => {
  const features: GeoJSON.Feature[] = [];

  for (const el of data.elements) {
    if (el.type === 'way' && el.geometry) {
      features.push({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: el.geometry.map((p) => [p.lon, p.lat]),
        },
      });
    } else if (el.type === 'relation' && el.members) {
      for (const member of el.members) {
        if (member.type === 'way' && member.geometry) {
          features.push({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: member.geometry.map((p) => [p.lon, p.lat]),
            },
          });
        }
      }
    }
  }

  return { type: 'FeatureCollection' as const, features };
};

const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const GET = async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const riverId = Number(id);
  if (Number.isNaN(riverId)) {
    return NextResponse.json({ error: 'Neplatné ID.' }, { status: 400 });
  }

  const sql = await connectDb();

  const rows = await sql`SELECT name, meta FROM river WHERE id = ${riverId}`;
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Tok nenalezen.' }, { status: 404 });
  }

  const river = rows[0];
  const meta = (river.meta as Record<string, unknown>) ?? {};

  // Check cache
  if (meta.geometry && meta.geometry_fetched_at) {
    const fetchedAt = new Date(meta.geometry_fetched_at as string).getTime();
    if (Date.now() - fetchedAt < CACHE_MAX_AGE_MS) {
      return NextResponse.json(meta.geometry);
    }
  }

  // Fetch from Overpass API
  const query = `[out:json][timeout:25];(relation["waterway"="river"]["name"="${river.name}"];way["waterway"="river"]["name"="${river.name}"];way["waterway"="stream"]["name"="${river.name}"];);out geom;`;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Chyba Overpass API.' }, { status: 502 });
    }

    const data: OverpassResponse = await res.json();
    const geojson = parseOverpassToGeoJSON(data);

    // Cache in DB
    await sql`
      UPDATE river
      SET meta = COALESCE(meta, '{}'::jsonb)
        || jsonb_build_object('geometry', ${JSON.stringify(geojson)}::jsonb, 'geometry_fetched_at', ${new Date().toISOString()})
      WHERE id = ${riverId}
    `;

    return NextResponse.json(geojson);
  } catch {
    return NextResponse.json({ error: 'Nepodařilo se načíst geometrii toku.' }, { status: 502 });
  }
};
