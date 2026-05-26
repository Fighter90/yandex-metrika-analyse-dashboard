import type { ChannelStat, UtmStat, GeoDeviceStat, PageStat } from '@pca/shared';
import type { Segment } from '../store/filters';

/** B2C-only channel names (from Metrika classification). */
const B2C_CHANNELS = new Set([
  'Direct traffic',
  'Search engine traffic',
  'Internal traffic',
  'Link traffic',
  'Social networks traffic',
  'Mailing traffic',
  'Messenger traffic',
  'Recommendation systems traffic',
]);

/** B2B-specific channel names (if any exist in your Metrika setup). */
const B2B_CHANNELS = new Set<string>([
  // Add B2B-specific channels here if you have them classified separately
]);

/** Check if a channel belongs to the given segment. */
function channelMatchesSegment(channel: string, segment: Segment): boolean {
  if (segment === 'b2c_b2b') return true;
  if (segment === 'b2c') return B2C_CHANNELS.has(channel);
  if (segment === 'b2b') return B2B_CHANNELS.has(channel);
  return true;
}

/** Filter channel stats by segment. */
export function filterBySegment<T extends { channel?: string }>(
  data: T[],
  segment: Segment,
): T[] {
  if (segment === 'b2c_b2b') return data;
  return data.filter((d) => d.channel && channelMatchesSegment(d.channel, segment));
}

/** Filter UTM stats by segment (based on channel). */
export function filterUtmBySegment(
  data: UtmStat[],
  segment: Segment,
  channels: ChannelStat[],
): UtmStat[] {
  if (segment === 'b2c_b2b') return data;
  // Filter channels first, then derive which UTM sources are relevant
  const filteredChannels = filterBySegment(channels, segment);
  const activeSources = new Set(
    filteredChannels.map((c) => c.utmSource).filter(Boolean),
  );
  if (activeSources.size === 0) return data;
  return data.filter((u) => activeSources.has(u.source));
}

/** Filter geo/device stats by segment. */
export function filterGeoBySegment(
  data: GeoDeviceStat[],
  _segment: Segment,
): GeoDeviceStat[] {
  // Geo/device data applies to all segments equally
  return data;
}

/** Filter page stats by segment. */
export function filterPagesBySegment(
  data: PageStat[],
  _segment: Segment,
): PageStat[] {
  // Page data applies to all segments equally
  return data;
}
