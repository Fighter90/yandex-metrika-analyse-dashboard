import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { GeoDeviceStat } from '@pca/shared';
import { renderWithProviders } from '../test/utils';

vi.mock('../lib/api', () => ({ api: { geoDevice: vi.fn() } }));
import { api } from '../lib/api';
import { AudienceView, Audience } from './audience';

const geoDevice = api.geoDevice as unknown as ReturnType<typeof vi.fn>;

const geo = (over: Partial<GeoDeviceStat>): GeoDeviceStat => ({
  date: '2025-01-01',
  country: 'Россия',
  device: 'mobile',
  visits: 10,
  users: 9,
  goalReaches: 1,
  conversionRate: 0.1,
  ...over,
});

beforeEach(() => geoDevice.mockReset());

describe('AudienceView', () => {
  it('renders loading and error states', () => {
    const { rerender } = render(<AudienceView status="pending" stats={[]} />);
    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
    rerender(<AudienceView status="error" stats={[]} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders the country + device tables on success', () => {
    render(
      <AudienceView status="success" stats={[geo({ country: 'Россия', device: 'mobile' })]} />,
    );
    expect(screen.getByRole('heading', { name: 'Страна' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Устройство' })).toBeInTheDocument();
    expect(screen.getByText('Россия')).toBeInTheDocument();
    expect(screen.getByText('mobile')).toBeInTheDocument();
    expect(screen.getAllByTestId('echart')).toHaveLength(2); // country bar + device donut
  });
});

describe('Audience (data wrapper)', () => {
  it('renders the tables after the query resolves', async () => {
    geoDevice.mockResolvedValue([geo({})]);
    renderWithProviders(<Audience />);
    expect(await screen.findByRole('heading', { name: 'Страна' })).toBeInTheDocument();
  });
});
