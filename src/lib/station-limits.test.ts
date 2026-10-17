import { describe, it, expect } from 'vitest';
import { extractStationLimits, getStationStage } from './station-limits';

// Řádek ze skutečného meta1.json ČHMÚ (Špindlerův Mlýn)
const spindleruvMlyn = {
  objID: '0-203-1-001000',
  DBC: '001000',
  STATION_NAME: 'Špindlerův Mlýn',
  STREAM_NAME: 'Labe',
  GEOGR1: 50.7231692,
  GEOGR2: 15.5980379,
  SPA_TYP: 'H',
  SPAH_DS: 'vodní stav',
  SPAH_UNIT: 'CM',
  DRYH: 90,
  SPA1H: 165,
  SPA2H: 200,
  SPA3H: 220,
  SPA4H: 297,
  SPAQ_DS: 'průtok',
  SPAQ_UNIT: 'M3_S',
  DRYQ: 0.419,
  SPA1Q: 19.3,
  SPA2Q: 39.4,
  SPA3Q: 54.5,
  SPA4Q: 137,
  ISFORECAST: 0,
};

describe('extractStationLimits', () => {
  it('maps drought and flood limits for water level and discharge in ascending order', () => {
    expect(extractStationLimits(spindleruvMlyn)).toEqual([
      { label: 'Sucho', waterLevelCm: 90, dischargeM3s: 0.419 },
      { label: '1. SPA – bdělost', waterLevelCm: 165, dischargeM3s: 19.3 },
      { label: '2. SPA – pohotovost', waterLevelCm: 200, dischargeM3s: 39.4 },
      { label: '3. SPA – ohrožení', waterLevelCm: 220, dischargeM3s: 54.5 },
      { label: 'Extrémní povodeň', waterLevelCm: 297, dischargeM3s: 137 },
    ]);
  });

  it('keeps a limit defined only for one quantity', () => {
    const limits = extractStationLimits({ ...spindleruvMlyn, SPA1Q: null, SPA2H: null });
    expect(limits[1]).toEqual({ label: '1. SPA – bdělost', waterLevelCm: 165, dischargeM3s: null });
    expect(limits[2]).toEqual({ label: '2. SPA – pohotovost', waterLevelCm: null, dischargeM3s: 39.4 });
  });

  it('omits limits missing for both quantities', () => {
    const limits = extractStationLimits({
      ...spindleruvMlyn,
      SPA1H: null,
      SPA1Q: null,
      SPA2H: null,
      SPA2Q: null,
      SPA3H: null,
      SPA3Q: null,
    });
    expect(limits.map((l) => l.label)).toEqual(['Sucho', 'Extrémní povodeň']);
  });

  it('ignores non-numeric values', () => {
    const limits = extractStationLimits({ DRYH: '90', DRYQ: Number.NaN, SPA1H: 165 });
    expect(limits).toEqual([{ label: '1. SPA – bdělost', waterLevelCm: 165, dischargeM3s: null }]);
  });

  it('returns no limits for missing or non-object meta', () => {
    expect(extractStationLimits(null)).toEqual([]);
    expect(extractStationLimits({})).toEqual([]);
    // dvojitě zakódovaná meta (JSON string místo objektu)
    expect(extractStationLimits(JSON.stringify(spindleruvMlyn))).toEqual([]);
  });
});

describe('getStationStage', () => {
  const at = (water_level_cm: number | null, discharge_m3s: number | null = null) => ({
    water_level_cm,
    discharge_m3s,
  });

  it('returns the highest reached flood stage by water level', () => {
    expect(getStationStage(spindleruvMlyn, at(300))).toEqual({
      key: 'spa4',
      label: 'Extrémní povodeň',
    });
    expect(getStationStage(spindleruvMlyn, at(210))).toEqual({
      key: 'spa2',
      label: '2. SPA – pohotovost',
    });
    expect(getStationStage(spindleruvMlyn, at(165))).toEqual({
      key: 'spa1',
      label: '1. SPA – bdělost',
    });
  });

  it('reports drought at or below the drought limit', () => {
    expect(getStationStage(spindleruvMlyn, at(90))).toEqual({ key: 'drought', label: 'Sucho' });
  });

  it('reports a normal stage between drought and the first flood stage', () => {
    expect(getStationStage(spindleruvMlyn, at(120))).toEqual({
      key: 'normal',
      label: 'Běžný stav',
    });
  });

  it('uses discharge when flood stages are defined by discharge', () => {
    const byDischarge = { ...spindleruvMlyn, SPA_TYP: 'Q' };
    expect(getStationStage(byDischarge, at(120, 40))).toEqual({
      key: 'spa2',
      label: '2. SPA – pohotovost',
    });
  });

  it('falls back to the other quantity when the preferred one is not measured', () => {
    expect(getStationStage(spindleruvMlyn, at(null, 20))).toEqual({
      key: 'spa1',
      label: '1. SPA – bdělost',
    });
  });

  it('returns null without limits or measurement', () => {
    expect(getStationStage({}, at(120))).toBeNull();
    expect(getStationStage(null, at(120))).toBeNull();
    expect(getStationStage(spindleruvMlyn, at(null))).toBeNull();
  });
});
