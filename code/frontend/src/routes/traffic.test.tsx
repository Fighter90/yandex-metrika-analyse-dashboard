import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ChannelStat } from '@pca/shared';
import { renderWithProviders } from '../test/utils';

vi.mock('../lib/api', () => ({ api: { channels: vi.fn() } }));
import { api } from '../lib/api';
import { TrafficView, Traffic } from './traffic';

const channels = api.channels as unknown as ReturnType<typeof vi.fn>;

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

beforeEach(() => channels.mockReset());

describe('TrafficView', () => {
  it('renders loading and error states', () => {
    const { rerender } = render(<TrafficView status="pending" stats={[]} />);
    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
    rerender(<TrafficView status="error" stats={[]} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows the low-UTM badge and channel table when coverage is low', () => {
    render(<TrafficView status="success" stats={[stat({ utmSource: null })]} />);
    expect(screen.getByRole('status')).toHaveTextContent(/Низкое покрытие UTM/);
    expect(screen.getByText('Каналы — визиты')).toBeInTheDocument();
    expect(screen.getByText('podcast')).toBeInTheDocument();
  });

  it('hides the badge when UTM coverage is high', () => {
    render(<TrafficView status="success" stats={[stat({ utmSource: 'podcast' })]} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('Traffic (data wrapper)', () => {
  it('renders the table after the query resolves', async () => {
    channels.mockResolvedValue([stat({})]);
    renderWithProviders(<Traffic />);
    expect(await screen.findByText('Каналы — визиты')).toBeInTheDocument();
  });
});
