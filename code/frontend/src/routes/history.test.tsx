import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '../test/utils';

vi.mock('../lib/api', () => ({
  api: {
    listSnapshots: vi.fn(),
  },
}));
import { api } from '../lib/api';
import { HistoryView, History } from './history';

describe('HistoryView', () => {
  it('renders loading state', () => {
    render(<HistoryView status="pending" snapshots={[]} />);
    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(<HistoryView status="error" snapshots={[]} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders empty state when no snapshots exist', () => {
    render(<HistoryView status="success" snapshots={[]} />);
    expect(screen.getByText(/Отчётов пока нет/)).toBeInTheDocument();
  });

  it('renders a table of snapshots on success', () => {
    const snapshots = [
      { id: 'snap-1', generatedAt: '2025-01-01T00:00:00Z', dateFrom: '2025-01-01', dateTo: '2025-01-07' },
    ];
    render(<HistoryView status="success" snapshots={snapshots} />);
    expect(screen.getByText('История отчётов')).toBeInTheDocument();
    expect(screen.getByText('snap-1')).toBeInTheDocument();
    expect(screen.getByText('Всего отчётов: 1')).toBeInTheDocument();
  });
});

describe('History (data wrapper)', () => {
  afterEach(() => vi.resetAllMocks());

  it('loads and renders snapshots', async () => {
    vi.mocked(api.listSnapshots).mockResolvedValue([
      { id: 'snap-1', generatedAt: '2025-01-01T00:00:00Z', dateFrom: '2025-01-01', dateTo: '2025-01-07' },
    ]);
    renderWithProviders(<History />);
    expect(await screen.findByText('История отчётов')).toBeInTheDocument();
  });
});
