import { describe, it, expect } from 'vitest';
import type { ChannelStat } from '@pca/shared';
import { heatmapMatrix, visitsHeatmapOption, HEATMAP_TOP_CHANNELS } from './heatmap';

const stat = (over: Partial<ChannelStat>): ChannelStat => ({
  date: '2025-01-01',
  channel: 'podcast',
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  visits: 10,
  users: 9,
  bounceRate: 0.2,
  avgDuration: 60,
  goalReaches: 1,
  conversionRate: 0.1,
  ...over,
});

describe('heatmapMatrix', () => {
  it('empty input → empty matrix with max 0', () => {
    expect(heatmapMatrix([])).toEqual({ dates: [], channels: [], cells: [], max: 0 });
  });

  it('sorts dates, picks top channels by total visits, sums (channel,date) visits', () => {
    const m = heatmapMatrix([
      stat({ channel: 'podcast', date: '2025-01-02', visits: 10 }),
      stat({ channel: 'podcast', date: '2025-01-01', visits: 5 }),
      stat({ channel: 'podcast', date: '2025-01-01', visits: 5 }), // merges with above → 10
      stat({ channel: 'direct', date: '2025-01-01', visits: 3 }),
    ]);
    expect(m.dates).toEqual(['2025-01-01', '2025-01-02']);
    // podcast (20) before direct (3)
    expect(m.channels).toEqual(['podcast', 'direct']);
    // podcast/2025-01-01 = 5+5 = 10 at [x=0, y=0]
    expect(m.cells).toContainEqual([0, 0, 10]);
    // podcast/2025-01-02 = 10 at [x=1, y=0]
    expect(m.cells).toContainEqual([1, 0, 10]);
    // direct has no 2025-01-02 row → zero cell emitted at [x=1, y=1]
    expect(m.cells).toContainEqual([1, 1, 0]);
    expect(m.max).toBe(10);
  });

  it(`caps at top ${HEATMAP_TOP_CHANNELS} channels by total visits`, () => {
    const many = Array.from({ length: HEATMAP_TOP_CHANNELS + 2 }, (_, i) =>
      stat({ channel: `ch${i}`, visits: (i + 1) * 10 }),
    );
    const m = heatmapMatrix(many);
    expect(m.channels).toHaveLength(HEATMAP_TOP_CHANNELS);
    expect(m.channels).not.toContain('ch0');
  });
});

describe('visitsHeatmapOption', () => {
  it('builds a heatmap series with a visualMap and dates/channels axes', () => {
    const o = visitsHeatmapOption([
      stat({ channel: 'podcast', date: '2025-01-01', visits: 7 }),
    ]) as {
      xAxis: { data: string[] };
      yAxis: { data: string[] };
      visualMap: { min: number; max: number };
      series: { type: string; data: [number, number, number][] }[];
      tooltip: { valueFormatter: (v: number) => string };
    };
    expect(o.xAxis.data).toEqual(['2025-01-01']);
    expect(o.yAxis.data).toEqual(['podcast']);
    expect(o.visualMap.min).toBe(0);
    expect(o.visualMap.max).toBe(7);
    expect(o.series[0]?.type).toBe('heatmap');
    expect(o.series[0]?.data).toContainEqual([0, 0, 7]);
    expect(typeof o.tooltip.valueFormatter).toBe('function');
  });

  it('empty input → empty axes/series and visualMap max 0', () => {
    const o = visitsHeatmapOption([]) as {
      xAxis: { data: string[] };
      yAxis: { data: string[] };
      visualMap: { max: number };
      series: { data: unknown[] }[];
    };
    expect(o.xAxis.data).toEqual([]);
    expect(o.yAxis.data).toEqual([]);
    expect(o.visualMap.max).toBe(0);
    expect(o.series[0]?.data).toEqual([]);
  });
});
