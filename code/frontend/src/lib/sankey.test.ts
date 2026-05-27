import { describe, it, expect } from 'vitest';
import type { UtmStat } from '@pca/shared';
import { utmSankeyOption, SANKEY_TERMINAL, SANKEY_NO_UTM } from './sankey';

const utmStat = (over: Partial<UtmStat>): UtmStat => ({
  date: '2025-01-01',
  utmSource: 'vk',
  utmMedium: 'cpc',
  utmCampaign: 'spring',
  visits: 10,
  users: 9,
  goalReaches: 1,
  conversionRate: 0.1,
  ...over,
});

interface SankeyOption {
  tooltip: { valueFormatter: (v: number) => string };
  series: {
    type: string;
    label: { formatter: (p: { name: string }) => string };
    data: { name: string }[];
    links: { source: string; target: string; value: number }[];
  }[];
}

function parse(o: object): SankeyOption {
  return o as SankeyOption;
}

describe('utmSankeyOption', () => {
  it('empty input → empty nodes and links', () => {
    const o = parse(utmSankeyOption([]));
    expect(o.series[0]?.type).toBe('sankey');
    expect(o.series[0]?.data).toEqual([]);
    expect(o.series[0]?.links).toEqual([]);
  });

  it('builds source→campaign (Σvisits) and campaign→Заявки (ΣgoalReaches) links', () => {
    const o = parse(
      utmSankeyOption([
        utmStat({ utmSource: 'vk', utmCampaign: 'spring', visits: 10, goalReaches: 2 }),
        utmStat({ utmSource: 'vk', utmCampaign: 'spring', visits: 30, goalReaches: 3 }),
        utmStat({ utmSource: 'tg', utmCampaign: 'launch', visits: 5, goalReaches: 1 }),
      ]),
    );
    const links = o.series[0]?.links ?? [];
    // source→campaign weighted by summed visits
    const vkSpring = links.find((l) => l.source === 'src:vk' && l.target === 'camp:spring');
    expect(vkSpring?.value).toBe(40);
    const tgLaunch = links.find((l) => l.source === 'src:tg' && l.target === 'camp:launch');
    expect(tgLaunch?.value).toBe(5);
    // campaign→terminal weighted by summed reaches
    const springReaches = links.find(
      (l) => l.source === 'camp:spring' && l.target === SANKEY_TERMINAL,
    );
    expect(springReaches?.value).toBe(5);
    const launchReaches = links.find(
      (l) => l.source === 'camp:launch' && l.target === SANKEY_TERMINAL,
    );
    expect(launchReaches?.value).toBe(1);
  });

  it('dedupes node names and contains no NaN values', () => {
    const o = parse(
      utmSankeyOption([
        utmStat({ utmSource: 'vk', utmCampaign: 'spring', visits: 10, goalReaches: 2 }),
        utmStat({ utmSource: 'vk', utmCampaign: 'spring', visits: 5, goalReaches: 1 }),
      ]),
    );
    const names = (o.series[0]?.data ?? []).map((n) => n.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain('src:vk');
    expect(names).toContain('camp:spring');
    expect(names).toContain(SANKEY_TERMINAL);
    for (const l of o.series[0]?.links ?? []) expect(Number.isNaN(l.value)).toBe(false);
  });

  it('treats (none)/empty source and campaign as «без UTM»', () => {
    const o = parse(
      utmSankeyOption([
        utmStat({ utmSource: '(none)', utmCampaign: '', visits: 7, goalReaches: 2 }),
      ]),
    );
    const links = o.series[0]?.links ?? [];
    expect(links.some((l) => l.source === `src:${SANKEY_NO_UTM}`)).toBe(true);
    expect(links.some((l) => l.target === `camp:${SANKEY_NO_UTM}`)).toBe(true);
  });

  it('skips zero-weight links (no visits, no reaches)', () => {
    const o = parse(
      utmSankeyOption([
        utmStat({ utmSource: 'vk', utmCampaign: 'spring', visits: 0, goalReaches: 0 }),
      ]),
    );
    expect(o.series[0]?.links).toEqual([]);
    expect(o.series[0]?.data).toEqual([]);
  });

  it('keeps a source→campaign link even when the campaign has zero reaches', () => {
    const o = parse(
      utmSankeyOption([
        utmStat({ utmSource: 'vk', utmCampaign: 'spring', visits: 12, goalReaches: 0 }),
      ]),
    );
    const links = o.series[0]?.links ?? [];
    expect(links).toHaveLength(1);
    expect(links[0]).toEqual({ source: 'src:vk', target: 'camp:spring', value: 12 });
  });

  it('formats node labels by stripping the internal namespace prefix', () => {
    const o = parse(utmSankeyOption([utmStat({})]));
    const fmt = o.series[0]?.label.formatter;
    expect(fmt?.({ name: 'src:vk' })).toBe('vk');
    expect(fmt?.({ name: 'camp:spring' })).toBe('spring');
    expect(fmt?.({ name: SANKEY_TERMINAL })).toBe(SANKEY_TERMINAL);
    // tooltip formatter is wired (intTooltip)
    expect(typeof o.tooltip.valueFormatter).toBe('function');
    expect(o.tooltip.valueFormatter(1290)).toContain('1');
  });
});
