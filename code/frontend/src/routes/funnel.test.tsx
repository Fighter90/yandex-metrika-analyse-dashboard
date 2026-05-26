import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ChannelStat, B2bDeal } from '@pca/shared';
import { renderWithProviders } from '../test/utils';

vi.mock('../lib/api', () => ({
  api: {
    channels: vi.fn(),
    b2b: vi.fn(),
    geoDevice: vi.fn().mockResolvedValue([]),
    pages: vi.fn().mockResolvedValue([]),
  },
}));
import { api } from '../lib/api';
import { FunnelView, Funnel } from './funnel';

beforeAll(() => {
  window.innerWidth = 1280;
  window.dispatchEvent(new Event('resize'));
});
afterAll(() => {
  window.innerWidth = 1024;
  window.dispatchEvent(new Event('resize'));
});

const stats: ChannelStat[] = [
  {
    date: '2025-01-01',
    channel: 'podcast',
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    visits: 1000,
    users: 900,
    bounceRate: 0.2,
    avgDuration: 60,
    goalReaches: 100,
    conversionRate: 0.1,
  },
];
const deals: B2bDeal[] = [
  { id: 1, company: 'Acme', tickets: 30, stage: 'paid', dateAdded: '2025-01-01' },
];

describe('FunnelView', () => {
  it('renders the loading state', () => {
    render(<FunnelView status="pending" stats={[]} deals={[]} geoDevice={[]} pages={[]} />);
    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
  });

  it('renders the error state', () => {
    render(<FunnelView status="error" stats={[]} deals={[]} geoDevice={[]} pages={[]} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders empty state when no data is available', () => {
    render(<FunnelView status="success" stats={[]} deals={[]} geoDevice={[]} pages={[]} />);
    expect(screen.getByText(/Нет данных за выбранный период/)).toBeInTheDocument();
  });

  it('renders the funnel stages + chart on success', () => {
    render(<FunnelView status="success" stats={stats} deals={deals} geoDevice={[]} pages={[]} />);
    expect(screen.getByText('Визитов')).toBeInTheDocument();
    expect(screen.getByText('Оплачено B2B')).toBeInTheDocument();
    // Multiple charts now: funnel, channel CR, geo
    expect(screen.getAllByTestId('echart').length).toBeGreaterThanOrEqual(2);
  });
});

describe('Funnel (wrapper)', () => {
  beforeEach(() => {
    vi.mocked(api.channels).mockResolvedValue(stats);
    vi.mocked(api.b2b).mockResolvedValue(deals);
  });

  it('loads channel + B2B data and renders the funnel', async () => {
    renderWithProviders(<Funnel />);
    expect(await screen.findByText('Воронка конверсии')).toBeInTheDocument();
    expect(screen.getByText('Визитов')).toBeInTheDocument();
  });

  it('shows the error state when a query fails', async () => {
    vi.mocked(api.b2b).mockRejectedValue(new Error('boom'));
    renderWithProviders(<Funnel />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
