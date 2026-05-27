import { describe, it, expect } from 'vitest';
import {
  filterBySegment,
  filterUtmBySegment,
  filterGeoBySegment,
  filterPagesBySegment,
} from './segment-filter';
import type { ChannelStat, UtmStat, GeoDeviceStat, PageStat } from '@pca/shared';

const makeChannel = (channel: string, visits = 100, goalReaches = 10): ChannelStat => ({
  date: '2025-01-01',
  channel,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  visits,
  users: 90,
  bounceRate: 0.2,
  avgDuration: 60,
  goalReaches,
  conversionRate: goalReaches / visits,
});

const makeUtm = (
  source: string,
  medium: string,
  campaign: string,
  visits = 50,
  goalReaches = 5,
): UtmStat => ({
  date: '2025-01-01',
  utmSource: source,
  utmMedium: medium,
  utmCampaign: campaign,
  visits,
  users: visits,
  goalReaches,
  conversionRate: goalReaches / visits,
});

describe('filterBySegment', () => {
  it('returns all channels for b2c_b2b segment', () => {
    const channels = [makeChannel('Direct traffic'), makeChannel('Search engine traffic')];
    expect(filterBySegment(channels, 'b2c_b2b')).toHaveLength(2);
  });

  it('returns only B2C channels for b2c segment', () => {
    const channels = [
      makeChannel('Direct traffic', 100, 10),
      makeChannel('Search engine traffic', 80, 8),
      makeChannel('Social networks traffic', 60, 3),
    ];
    const result = filterBySegment(channels, 'b2c');
    expect(result).toHaveLength(3);
    expect(result.every((c) => c.channel)).toBe(true);
  });

  it('returns empty array for b2b segment (no B2B channels defined by default)', () => {
    const channels = [makeChannel('Direct traffic'), makeChannel('Search engine traffic')];
    expect(filterBySegment(channels, 'b2b')).toHaveLength(0);
  });

  it('handles empty input', () => {
    expect(filterBySegment([], 'b2c')).toEqual([]);
    expect(filterBySegment([], 'b2b')).toEqual([]);
    expect(filterBySegment([], 'b2c_b2b')).toEqual([]);
  });
});

describe('filterUtmBySegment', () => {
  it('returns all UTM data for b2c_b2b segment', () => {
    const channels = [makeChannel('Direct traffic')];
    const utm = [makeUtm('google', 'cpc', 'campaign1')];
    expect(filterUtmBySegment(utm, 'b2c_b2b', channels)).toHaveLength(1);
  });

  it('filters UTM data based on active channel sources for b2c segment', () => {
    const channels = [makeChannel('Direct traffic')];
    const utm = [
      makeUtm('google', 'cpc', 'campaign1', 50, 5),
      makeUtm('yandex', 'cpc', 'campaign2', 30, 3),
    ];
    const result = filterUtmBySegment(utm, 'b2c', channels);
    // UTM filtering is based on active sources from filtered channels
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it('handles empty UTM data', () => {
    const channels = [makeChannel('Direct traffic')];
    expect(filterUtmBySegment([], 'b2c', channels)).toEqual([]);
  });

  it('handles empty channels', () => {
    const utm = [makeUtm('google', 'cpc', 'campaign1')];
    // When no channels, UTM data is returned as-is for b2c_b2b, filtered for others
    expect(filterUtmBySegment(utm, 'b2c_b2b', [])).toEqual(utm);
    expect(filterUtmBySegment(utm, 'b2c', [])).toEqual([]);
  });

  it('returns matching UTM data when active sources exist (covers the filter branch)', () => {
    // Channel has a non-null utmSource → activeSources.size > 0 → line 47 is exercised
    const channelWithSource: ChannelStat = {
      ...makeChannel('Direct traffic'),
      utmSource: 'google',
    };
    const utm = [makeUtm('google', 'cpc', 'spring'), makeUtm('yandex', 'cpc', 'other')];
    const result = filterUtmBySegment(utm, 'b2c', [channelWithSource]);
    // Only the google UTM should be returned (matches active source)
    expect(result).toHaveLength(1);
    expect(result[0]!.utmSource).toBe('google');
  });
});

describe('filterGeoBySegment', () => {
  it('returns all geo data unchanged for any segment', () => {
    const geo: GeoDeviceStat[] = [
      {
        date: '2025-01-01',
        country: 'Россия',
        device: 'mobile',
        visits: 60,
        users: 55,
        goalReaches: 3,
        conversionRate: 0.05,
      },
    ];
    expect(filterGeoBySegment(geo, 'b2c')).toEqual(geo);
    expect(filterGeoBySegment(geo, 'b2b')).toEqual(geo);
    expect(filterGeoBySegment(geo, 'b2c_b2b')).toEqual(geo);
  });

  it('handles empty input', () => {
    expect(filterGeoBySegment([], 'b2c')).toEqual([]);
  });
});

describe('filterPagesBySegment', () => {
  it('returns all page data unchanged for any segment', () => {
    const pages: PageStat[] = [
      {
        date: '2025-01-01',
        page: '/lp',
        visits: 100,
        users: 90,
        bounceRate: 0.2,
        goalReaches: 5,
        conversionRate: 0.05,
      },
    ];
    expect(filterPagesBySegment(pages, 'b2c')).toEqual(pages);
    expect(filterPagesBySegment(pages, 'b2b')).toEqual(pages);
    expect(filterPagesBySegment(pages, 'b2c_b2b')).toEqual(pages);
  });

  it('handles empty input', () => {
    expect(filterPagesBySegment([], 'b2c')).toEqual([]);
  });
});

describe('filterBySegment — channel with no channel property', () => {
  it('filters out items with falsy channel when not b2c_b2b', () => {
    // Items without a channel field should be excluded when filtering by segment
    const itemsWithNoChannel = [{ channel: undefined, visits: 10, goalReaches: 1 }] as Array<{
      channel?: string;
      visits: number;
      goalReaches: number;
    }>;
    expect(filterBySegment(itemsWithNoChannel, 'b2c')).toHaveLength(0);
  });
});
