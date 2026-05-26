import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('./lib/api', () => ({
  api: {
    channels: vi.fn().mockResolvedValue([
      {
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
      },
    ]),
    primaryGoal: vi.fn().mockResolvedValue({
      id: 8,
      name: 'Ecommerce: покупка',
      type: 'action',
      isB2b: false,
      isArchived: false,
      syncedAt: '2025-01-01T00:00:00.000Z',
    }),
    geoDevice: vi.fn().mockResolvedValue([]),
  },
}));
import { App } from './App';
import { queryClient } from './lib/query';

afterEach(() => queryClient.clear());

describe('<App>', () => {
  it('renders the shell (nav) and the Overview page', async () => {
    render(<App />);
    // Nav hamburger button should be present
    expect(screen.getByRole('button', { name: /открыть меню/i })).toBeInTheDocument();
    // Overview resolves with data → KPI strip renders.
    expect(await screen.findByText(/Заявок/)).toBeInTheDocument();
  });
});
