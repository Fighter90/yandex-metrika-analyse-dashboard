import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ChannelStat } from '@pca/shared';
import { OverviewView } from './overview';

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

describe('OverviewView', () => {
  it('renders the loading state', () => {
    render(<OverviewView status="pending" stats={[]} />);
    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
  });

  it('renders the error state', () => {
    render(<OverviewView status="error" stats={[]} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders the KPI strip and charts on success', () => {
    render(<OverviewView status="success" stats={[sample]} />);
    expect(screen.getByText('Цель (платных билетов)')).toBeInTheDocument();
    expect(screen.getByText(/Заявок/)).toBeInTheDocument();
    expect(screen.getAllByTestId('echart')).toHaveLength(2);
  });
});
