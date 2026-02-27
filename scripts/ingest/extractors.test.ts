import { describe, it, expect } from 'vitest';
import { parseMeta1, extractStationMetaFromMeta1Row } from './extractors';

describe('parseMeta1', () => {
  it('parses valid input with header + values', () => {
    const meta = {
      data: {
        data: {
          header: 'objID, DBC, STATION_NAME',
          values: [
            ['id1', '001', 'Stanice A'],
            ['id2', '002', 'Stanice B'],
          ],
        },
      },
    };

    const rows = parseMeta1(meta);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ objID: 'id1', DBC: '001', STATION_NAME: 'Stanice A' });
    expect(rows[1]).toEqual({ objID: 'id2', DBC: '002', STATION_NAME: 'Stanice B' });
  });

  it('returns [] when data.data is missing', () => {
    expect(parseMeta1({})).toEqual([]);
    expect(parseMeta1({ data: {} })).toEqual([]);
    expect(parseMeta1(null)).toEqual([]);
    expect(parseMeta1(undefined)).toEqual([]);
  });

  it('returns [] when header is missing', () => {
    const meta = { data: { data: { values: [['a']] } } };
    expect(parseMeta1(meta)).toEqual([]);
  });

  it('returns [] when values is empty', () => {
    const meta = { data: { data: { header: 'objID', values: [] } } };
    expect(parseMeta1(meta)).toEqual([]);
  });
});

describe('extractStationMetaFromMeta1Row', () => {
  const fullRow = {
    objID: 'station-1',
    DBC: 'ABC',
    STATION_NAME: 'Test Station',
    STREAM_NAME: 'Vltava',
    GEOGR1: 50.08,
    GEOGR2: 14.42,
    ISFORECAST: 1,
  };

  it('extracts complete station meta from a full row', () => {
    const result = extractStationMetaFromMeta1Row(fullRow);
    expect(result).toEqual({
      id: 'station-1',
      code: 'ABC',
      name: 'Test Station',
      riverName: 'Vltava',
      lat: 50.08,
      lon: 14.42,
      isForecast: true,
      raw: fullRow,
    });
  });

  it('returns null when objID is missing', () => {
    expect(extractStationMetaFromMeta1Row({ STATION_NAME: 'X' })).toBeNull();
  });

  it('returns null when STATION_NAME is missing', () => {
    expect(extractStationMetaFromMeta1Row({ objID: 'x' })).toBeNull();
  });

  it('converts DBC number to string', () => {
    const row = { ...fullRow, DBC: 42 };
    const result = extractStationMetaFromMeta1Row(row);
    expect(result?.code).toBe('42');
  });

  it('returns riverName: null for empty STREAM_NAME', () => {
    const row = { ...fullRow, STREAM_NAME: '' };
    const result = extractStationMetaFromMeta1Row(row);
    expect(result?.riverName).toBeNull();
  });

  it('returns null lat/lon for non-number GEOGR values', () => {
    const row = { ...fullRow, GEOGR1: 'not-a-number', GEOGR2: undefined };
    const result = extractStationMetaFromMeta1Row(row);
    expect(result?.lat).toBeNull();
    expect(result?.lon).toBeNull();
  });

  it('maps ISFORECAST 0 to false', () => {
    const row = { ...fullRow, ISFORECAST: 0 };
    expect(extractStationMetaFromMeta1Row(row)?.isForecast).toBe(false);
  });

  it('maps ISFORECAST 1 to true', () => {
    const row = { ...fullRow, ISFORECAST: 1 };
    expect(extractStationMetaFromMeta1Row(row)?.isForecast).toBe(true);
  });

  it('maps other ISFORECAST values to null', () => {
    const row = { ...fullRow, ISFORECAST: 'yes' };
    expect(extractStationMetaFromMeta1Row(row)?.isForecast).toBeNull();
  });
});
