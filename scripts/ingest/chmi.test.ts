import { describe, it, expect } from 'vitest';
import {
  mergeTimeseries,
  mergeHistoricalTimeseries,
  parseIndexHtmlForJsonFiles,
  runWithConcurrency,
} from './chmi';

describe('mergeTimeseries', () => {
  it('returns empty array for empty input', () => {
    expect(mergeTimeseries({})).toEqual([]);
    expect(mergeTimeseries({ tsList: [] })).toEqual([]);
  });

  it('merges H-only timeseries', () => {
    const input = {
      tsList: [
        {
          tsConID: 'H',
          tsData: [
            { dt: '2024-01-01T00:00:00Z', value: 120 },
            { dt: '2024-01-01T01:00:00Z', value: 130 },
          ],
        },
      ],
    };
    const result = mergeTimeseries(input);
    expect(result).toEqual([
      { ts: '2024-01-01T00:00:00Z', water_level_cm: 120, discharge_m3s: null },
      { ts: '2024-01-01T01:00:00Z', water_level_cm: 130, discharge_m3s: null },
    ]);
  });

  it('merges Q-only timeseries', () => {
    const input = {
      tsList: [
        {
          tsConID: 'Q',
          tsData: [{ dt: '2024-01-01T00:00:00Z', value: 5.5 }],
        },
      ],
    };
    const result = mergeTimeseries(input);
    expect(result).toEqual([
      { ts: '2024-01-01T00:00:00Z', water_level_cm: null, discharge_m3s: 5.5 },
    ]);
  });

  it('merges H and Q at the same timestamp', () => {
    const input = {
      tsList: [
        {
          tsConID: 'H',
          tsData: [{ dt: '2024-01-01T00:00:00Z', value: 100 }],
        },
        {
          tsConID: 'Q',
          tsData: [{ dt: '2024-01-01T00:00:00Z', value: 3.2 }],
        },
      ],
    };
    const result = mergeTimeseries(input);
    expect(result).toEqual([
      { ts: '2024-01-01T00:00:00Z', water_level_cm: 100, discharge_m3s: 3.2 },
    ]);
  });

  it('filters out NaN values', () => {
    const input = {
      tsList: [
        {
          tsConID: 'H',
          tsData: [{ dt: '2024-01-01T00:00:00Z', value: NaN }],
        },
      ],
    };
    const result = mergeTimeseries(input);
    expect(result).toEqual([]);
  });

  it('filters out Infinity values', () => {
    const input = {
      tsList: [
        {
          tsConID: 'H',
          tsData: [
            { dt: '2024-01-01T00:00:00Z', value: Infinity },
            { dt: '2024-01-01T01:00:00Z', value: -Infinity },
          ],
        },
      ],
    };
    const result = mergeTimeseries(input);
    expect(result).toEqual([]);
  });

  it('sorts results by timestamp', () => {
    const input = {
      tsList: [
        {
          tsConID: 'H',
          tsData: [
            { dt: '2024-01-01T02:00:00Z', value: 200 },
            { dt: '2024-01-01T00:00:00Z', value: 100 },
            { dt: '2024-01-01T01:00:00Z', value: 150 },
          ],
        },
      ],
    };
    const result = mergeTimeseries(input);
    expect(result.map((p) => p.ts)).toEqual([
      '2024-01-01T00:00:00Z',
      '2024-01-01T01:00:00Z',
      '2024-01-01T02:00:00Z',
    ]);
  });

  it('ignores unknown series keys', () => {
    const input = {
      tsList: [
        {
          tsConID: 'X',
          tsData: [{ dt: '2024-01-01T00:00:00Z', value: 999 }],
        },
      ],
    };
    const result = mergeTimeseries(input);
    expect(result).toEqual([]);
  });

  it('keeps point with one valid and one NaN value', () => {
    const input = {
      tsList: [
        {
          tsConID: 'H',
          tsData: [{ dt: '2024-01-01T00:00:00Z', value: 120 }],
        },
        {
          tsConID: 'Q',
          tsData: [{ dt: '2024-01-01T00:00:00Z', value: NaN }],
        },
      ],
    };
    const result = mergeTimeseries(input);
    expect(result).toEqual([
      { ts: '2024-01-01T00:00:00Z', water_level_cm: 120, discharge_m3s: null },
    ]);
  });
});

describe('mergeHistoricalTimeseries', () => {
  it('returns empty array for empty input', () => {
    expect(mergeHistoricalTimeseries({})).toEqual([]);
    expect(mergeHistoricalTimeseries({ tsList: [] })).toEqual([]);
  });

  it('merges HD-only timeseries', () => {
    const input = {
      tsList: [
        {
          tsConID: 'HD',
          tsData: { data: { values: [['2024-01-01T00:00:00Z', 150]] } },
        },
      ],
    };
    const result = mergeHistoricalTimeseries(input);
    expect(result).toEqual([
      { ts: '2024-01-01T00:00:00Z', water_level_cm: 150, discharge_m3s: null },
    ]);
  });

  it('merges QD-only timeseries', () => {
    const input = {
      tsList: [
        {
          tsConID: 'QD',
          tsData: { data: { values: [['2024-01-01T00:00:00Z', 4.2]] } },
        },
      ],
    };
    const result = mergeHistoricalTimeseries(input);
    expect(result).toEqual([
      { ts: '2024-01-01T00:00:00Z', water_level_cm: null, discharge_m3s: 4.2 },
    ]);
  });

  it('merges HD and QD at the same timestamp', () => {
    const input = {
      tsList: [
        {
          tsConID: 'HD',
          tsData: { data: { values: [['2024-01-01T00:00:00Z', 200]] } },
        },
        {
          tsConID: 'QD',
          tsData: { data: { values: [['2024-01-01T00:00:00Z', 8.1]] } },
        },
      ],
    };
    const result = mergeHistoricalTimeseries(input);
    expect(result).toEqual([
      { ts: '2024-01-01T00:00:00Z', water_level_cm: 200, discharge_m3s: 8.1 },
    ]);
  });

  it('filters out NaN and Infinity values', () => {
    const input = {
      tsList: [
        {
          tsConID: 'HD',
          tsData: {
            data: {
              values: [
                ['2024-01-01T00:00:00Z', NaN],
                ['2024-01-01T01:00:00Z', Infinity],
              ],
            },
          },
        },
      ],
    };
    const result = mergeHistoricalTimeseries(input);
    expect(result).toEqual([]);
  });

  it('sorts results by timestamp', () => {
    const input = {
      tsList: [
        {
          tsConID: 'HD',
          tsData: {
            data: {
              values: [
                ['2024-01-02', 200],
                ['2024-01-01', 100],
              ],
            },
          },
        },
      ],
    };
    const result = mergeHistoricalTimeseries(input);
    expect(result[0].ts).toBe('2024-01-01');
    expect(result[1].ts).toBe('2024-01-02');
  });
});

describe('parseIndexHtmlForJsonFiles', () => {
  it('extracts JSON file links from HTML', () => {
    const html = `
      <a href="station1.json">station1.json</a>
      <a href="station2.json">station2.json</a>
    `;
    expect(parseIndexHtmlForJsonFiles(html)).toEqual(['station1.json', 'station2.json']);
  });

  it('deduplicates links', () => {
    const html = `
      <a href="station1.json">link1</a>
      <a href="station1.json">link2</a>
    `;
    expect(parseIndexHtmlForJsonFiles(html)).toEqual(['station1.json']);
  });

  it('returns empty array for HTML without JSON links', () => {
    const html = '<a href="page.html">Page</a><a href="style.css">CSS</a>';
    expect(parseIndexHtmlForJsonFiles(html)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseIndexHtmlForJsonFiles('')).toEqual([]);
  });

  it('handles malformed HTML', () => {
    const html = '<a href="ok.json">ok</a><a href="broken';
    expect(parseIndexHtmlForJsonFiles(html)).toEqual(['ok.json']);
  });

  it('extracts filenames with paths', () => {
    const html = '<a href="sub/dir/file.json">file</a>';
    expect(parseIndexHtmlForJsonFiles(html)).toEqual(['sub/dir/file.json']);
  });
});

describe('runWithConcurrency', () => {
  it('processes all items', async () => {
    const items = [1, 2, 3, 4, 5];
    const result = await runWithConcurrency(items, 2, async (n) => n * 2);
    expect(result).toEqual([2, 4, 6, 8, 10]);
  });

  it('preserves order', async () => {
    const items = [3, 1, 2];
    const result = await runWithConcurrency(items, 10, async (n) => {
      await new Promise((r) => setTimeout(r, (4 - n) * 10));
      return n;
    });
    expect(result).toEqual([3, 1, 2]);
  });

  it('respects concurrency limit', async () => {
    let active = 0;
    let maxActive = 0;
    const items = [1, 2, 3, 4, 5, 6];

    await runWithConcurrency(items, 2, async (n) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 10));
      active--;
      return n;
    });

    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it('handles empty input', async () => {
    const result = await runWithConcurrency([], 5, async (n: number) => n);
    expect(result).toEqual([]);
  });

  it('propagates errors', async () => {
    const items = [1, 2, 3];
    await expect(
      runWithConcurrency(items, 2, async (n) => {
        if (n === 2) throw new Error('fail');
        return n;
      }),
    ).rejects.toThrow('fail');
  });

  it('handles limit larger than items', async () => {
    const items = [1, 2];
    const result = await runWithConcurrency(items, 100, async (n) => n * 3);
    expect(result).toEqual([3, 6]);
  });
});
