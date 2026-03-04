type MetaTable = {
  header: string; // "objID,DBC,STATION_NAME,..."
  values: any[][]; // rows
};

export type Meta1Row = Record<string, any>;

export const parseMeta1 = (meta: any): Meta1Row[] => {
  // podle tvého příkladu:
  // meta.data.data.header
  // meta.data.data.values
  const table: MetaTable | undefined = meta?.data?.data;
  if (!table?.header || !Array.isArray(table?.values)) return [];

  const cols = table.header.split(',').map((s) => s.trim());
  const rows: Meta1Row[] = [];

  for (const arr of table.values) {
    const row: Meta1Row = {};
    for (let i = 0; i < cols.length; i++) row[cols[i]] = arr[i];
    rows.push(row);
  }

  return rows;
};

export type StationMeta = {
  id: string; // objID
  code: string | null; // DBC
  name: string; // STATION_NAME
  riverName: string | null; // STREAM_NAME
  lat: number | null; // GEOGR1
  lon: number | null; // GEOGR2
  isForecast: boolean | null; // ISFORECAST (0/1)
  raw: Meta1Row; // full row keyed by header
};

export const extractStationMetaFromMeta1Row = (row: Meta1Row): StationMeta | null => {
  const id = row['objID'];
  const name = row['STATION_NAME'];

  if (typeof id !== 'string' || !id) return null;
  if (typeof name !== 'string' || !name) return null;

  const code =
    typeof row['DBC'] === 'string' ? row['DBC'] : ((row['DBC'] ?? null)?.toString?.() ?? null);

  const riverName =
    typeof row['STREAM_NAME'] === 'string' && row['STREAM_NAME'].trim()
      ? row['STREAM_NAME'].trim()
      : null;

  const rawLat = typeof row['GEOGR1'] === 'number' ? row['GEOGR1'] : null;
  const rawLon = typeof row['GEOGR2'] === 'number' ? row['GEOGR2'] : null;
  const lat = rawLat !== null && isFinite(rawLat) && rawLat >= -90 && rawLat <= 90 ? rawLat : null;
  const lon = rawLon !== null && isFinite(rawLon) && rawLon >= -180 && rawLon <= 180 ? rawLon : null;

  const isForecast = row['ISFORECAST'] === 0 ? false : row['ISFORECAST'] === 1 ? true : null;

  return {
    id,
    code,
    name,
    riverName,
    lat,
    lon,
    isForecast,
    raw: row,
  };
};
