import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ChannelStat, GeoDeviceStat } from '@pca/shared';
import { renderWithProviders } from '../test/utils';

vi.mock('../lib/api', () => ({
  api: {
    channels: vi.fn(),
    primaryGoal: vi.fn(),
    geoDevice: vi.fn(),
    utm: vi.fn(),
    pages: vi.fn(),
    exitPages: vi.fn(),
  },
}));
import { api } from '../lib/api';
import { OverviewView, Overview } from './overview';

const sample: ChannelStat = {
  date: '2025-01-01',
  channel: 'podcast',
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  visits: 100,
  users: 90,
  bounceRate: 0.2,
  avgDuration: 60,
  goalReaches: 5,
  conversionRate: 0.05,
};

const geoSample: GeoDeviceStat = {
  date: '2025-01-01',
  country: 'Россия',
  device: 'desktop',
  visits: 100,
  users: 90,
  goalReaches: 5,
  conversionRate: 0.05,
};

describe('OverviewView', () => {
  it('renders the loading state', () => {
    render(<OverviewView status="pending" stats={[]} />);
    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
  });

  it('renders the error state', () => {
    render(<OverviewView status="error" stats={[]} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders the KPI strip and charts on success (no weak spots for a single channel)', () => {
    render(<OverviewView status="success" stats={[sample]} />);
    expect(screen.getByText('Цель (платных билетов)')).toBeInTheDocument();
    expect(screen.getByText(/Заявок/)).toBeInTheDocument();
    expect(screen.getByText('Визиты и заявки по дням')).toBeInTheDocument();
    expect(screen.getAllByTestId('echart')).toHaveLength(2);
    expect(screen.getByText(/Нет слабых мест/)).toBeInTheDocument();
    expect(screen.queryByText(/KPI-цель определена автоматически/)).not.toBeInTheDocument();
  });

  it('shows the auto-detected KPI goal badge when a primary goal is provided', () => {
    render(<OverviewView status="success" stats={[sample]} primaryGoalName="Ecommerce: покупка" />);
    expect(screen.getByText(/KPI-цель определена автоматически/)).toBeInTheDocument();
    expect(screen.getByText('Ecommerce: покупка')).toBeInTheDocument();
  });

  it('renders empty state when no stats are available', () => {
    render(<OverviewView status="success" stats={[]} />);
    expect(screen.getByText(/Нет данных за выбранный период/)).toBeInTheDocument();
  });

  it('renders geo/device charts when geoDevice data is provided', () => {
    render(<OverviewView status="success" stats={[sample]} geoDevice={[geoSample]} />);
    expect(screen.getByText('Топ стран по визитам')).toBeInTheDocument();
    expect(screen.getByText('Доля устройств (визиты)')).toBeInTheDocument();
    // 2 base charts (visits+applications, channel mix) + 2 geo/device charts = 4
    expect(screen.getAllByTestId('echart')).toHaveLength(4);
  });

  it('lists weak spots when a channel converts below the overall rate', () => {
    render(
      <OverviewView
        status="success"
        stats={[
          { ...sample, channel: 'podcast', visits: 100, goalReaches: 1 },
          { ...sample, channel: 'vip', visits: 10, goalReaches: 9 },
        ]}
      />,
    );
    expect(screen.getByText('podcast')).toBeInTheDocument();
    expect(screen.getByText(/100 визитов · CR/)).toBeInTheDocument();
    expect(screen.queryByText(/Нет слабых мест/)).not.toBeInTheDocument();
  });
});

describe('Overview (data wrapper)', () => {
  afterEach(() => vi.resetAllMocks());

  beforeEach(() => {
    vi.mocked(api.utm).mockResolvedValue([]);
    vi.mocked(api.pages).mockResolvedValue([]);
    vi.mocked(api.exitPages).mockResolvedValue([]);
  });

  it('shows the auto-detected goal badge when /primary-goal resolves', async () => {
    vi.mocked(api.channels).mockResolvedValue([sample]);
    vi.mocked(api.primaryGoal).mockResolvedValue({
      id: 8,
      name: 'Ecommerce: покупка',
      type: 'action',
      isB2b: false,
      isArchived: false,
      syncedAt: 'x',
    });
    vi.mocked(api.geoDevice).mockResolvedValue([]);
    renderWithProviders(<Overview />);
    expect(await screen.findByText(/KPI-цель определена автоматически/)).toBeInTheDocument();
    expect(screen.getByText('Ecommerce: покупка')).toBeInTheDocument();
  });

  it('hides the badge when no primary goal is detected (404)', async () => {
    vi.mocked(api.channels).mockResolvedValue([sample]);
    vi.mocked(api.primaryGoal).mockRejectedValue(new Error('404'));
    vi.mocked(api.geoDevice).mockResolvedValue([]);
    renderWithProviders(<Overview />);
    expect(await screen.findByText('Цель (платных билетов)')).toBeInTheDocument();
    expect(screen.queryByText(/KPI-цель определена автоматически/)).not.toBeInTheDocument();
  });
});
