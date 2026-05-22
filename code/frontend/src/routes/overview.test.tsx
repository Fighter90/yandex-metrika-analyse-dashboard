import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import type { ChannelStat } from '@pca/shared';
import { renderWithProviders } from '../test/utils';

vi.mock('../lib/api', () => ({ api: { channels: vi.fn() } }));
import { api } from '../lib/api';
import { Overview } from './overview';

const channels = api.channels as unknown as ReturnType<typeof vi.fn>;

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

beforeEach(() => channels.mockReset());

describe('Overview', () => {
  it('shows a loading state', () => {
    channels.mockReturnValue(new Promise<ChannelStat[]>(() => {}));
    renderWithProviders(<Overview />);
    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
  });

  it('shows an error state', async () => {
    channels.mockRejectedValue(new Error('boom'));
    renderWithProviders(<Overview />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('renders the KPI strip and charts on success', async () => {
    channels.mockResolvedValue([sample]);
    renderWithProviders(<Overview />);
    expect(await screen.findByText(/Заявок/)).toBeInTheDocument();
    expect(screen.getAllByTestId('echart')).toHaveLength(2);
  });
});
