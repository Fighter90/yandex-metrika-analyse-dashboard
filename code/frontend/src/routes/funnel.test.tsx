import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ChannelStat, B2bDeal } from '@pca/shared';
import { renderWithProviders } from '../test/utils';

vi.mock('../lib/api', () => ({ api: { channels: vi.fn(), b2b: vi.fn() } }));
import { api } from '../lib/api';
import { FunnelView, Funnel } from './funnel';

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
    render(<FunnelView status="pending" stats={[]} deals={[]} />);
    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
  });

  it('renders the error state', () => {
    render(<FunnelView status="error" stats={[]} deals={[]} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders the funnel stages + chart on success', () => {
    render(<FunnelView status="success" stats={stats} deals={deals} />);
    expect(screen.getByText('Визиты')).toBeInTheDocument();
    expect(screen.getByText('Оплачено B2B')).toBeInTheDocument();
    expect(screen.getByText('засчитывается в цель')).toBeInTheDocument();
    expect(screen.getByTestId('echart')).toBeInTheDocument();
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
    expect(screen.getByText('Визиты')).toBeInTheDocument();
  });

  it('shows the error state when a query fails', async () => {
    vi.mocked(api.b2b).mockRejectedValue(new Error('boom'));
    renderWithProviders(<Funnel />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
