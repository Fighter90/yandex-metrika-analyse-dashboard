import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ChannelStat, UtmStat } from '@pca/shared';
import { renderWithProviders } from '../test/utils';

vi.mock('../lib/api', () => ({ api: { channels: vi.fn(), utm: vi.fn() } }));
import { api } from '../lib/api';
import { TrafficView, Traffic } from './traffic';

const channels = api.channels as unknown as ReturnType<typeof vi.fn>;
const utm = api.utm as unknown as ReturnType<typeof vi.fn>;

function stat(over: Partial<ChannelStat>): ChannelStat {
  return {
    date: '2025-01-01',
    channel: 'podcast',
    utmSource: 'podcast',
    utmMedium: null,
    utmCampaign: null,
    visits: 10,
    users: 9,
    bounceRate: 0.2,
    avgDuration: 60,
    goalReaches: 1,
    conversionRate: 0.1,
    ...over,
  };
}

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

beforeEach(() => {
  channels.mockReset();
  utm.mockReset();
});

describe('TrafficView', () => {
  it('renders loading and error states', () => {
    const { rerender } = render(<TrafficView status="pending" stats={[]} utm={[]} />);
    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
    rerender(<TrafficView status="error" stats={[]} utm={[]} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows the low-UTM badge, channel table, and the UTM-breakdown table', () => {
    // 100 channel visits, only 10 UTM-tagged → 10% coverage (< 70% → low badge shown).
    render(
      <TrafficView
        status="success"
        stats={[stat({ utmSource: null, visits: 100 })]}
        utm={[utmStat({ visits: 10 })]}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/Низкое покрытие UTM/);
    expect(screen.getByText('Каналы — визиты')).toBeInTheDocument();
    expect(screen.getByText('podcast')).toBeInTheDocument();
    expect(screen.getByText('UTM-разбивка')).toBeInTheDocument();
    expect(screen.getByText('spring')).toBeInTheDocument();
  });

  it('shows an empty state when there is no traffic data', () => {
    render(<TrafficView status="success" stats={[]} utm={[]} />);
    expect(screen.getByText(/Нет данных за выбранный период/)).toBeInTheDocument();
  });

  it('hides the badge when UTM coverage is high', () => {
    // 100 channel visits, 80 UTM-tagged → 80% coverage (≥ 70% → no low badge).
    render(
      <TrafficView
        status="success"
        stats={[stat({ visits: 100 })]}
        utm={[utmStat({ utmSource: 'vk', visits: 80 })]}
      />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('Traffic (data wrapper)', () => {
  it('renders both tables after the queries resolve', async () => {
    channels.mockResolvedValue([stat({})]);
    utm.mockResolvedValue([utmStat({})]);
    renderWithProviders(<Traffic />);
    expect(await screen.findByText('Каналы — визиты')).toBeInTheDocument();
    expect(screen.getByText('UTM-разбивка')).toBeInTheDocument();
  });
});
