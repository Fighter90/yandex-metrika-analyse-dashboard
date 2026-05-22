import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { RawResponse } from '@pca/shared';
import { renderWithProviders } from '../test/utils';

vi.mock('../lib/api', () => ({ api: { rawResponse: vi.fn() } }));
import { api } from '../lib/api';
import { SourcesView, Sources } from './sources';

const raw: RawResponse = {
  id: 1,
  endpoint: '/stat/v1/data',
  queryHash: 'abc123',
  dateFrom: '2025-01-01',
  dateTo: '2025-01-01',
  payload: { data: [{ metrics: [100] }] },
  fetchedAt: '2025-01-02T00:00:00.000Z',
};

const baseProps = {
  status: 'idle' as const,
  raw: undefined,
  idValue: '',
  onIdChange: vi.fn(),
  onLookup: vi.fn(),
};

describe('SourcesView', () => {
  it('prompts for an id and wires the input + button', () => {
    const onIdChange = vi.fn();
    const onLookup = vi.fn();
    render(<SourcesView {...baseProps} onIdChange={onIdChange} onLookup={onLookup} />);
    expect(screen.getByText('Откуда эта цифра?')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('raw_response_id'), { target: { value: '7' } });
    expect(onIdChange).toHaveBeenCalledWith('7');
    fireEvent.click(screen.getByRole('button', { name: 'Показать' }));
    expect(onLookup).toHaveBeenCalled();
  });

  it('shows pending and error states', () => {
    const { rerender } = render(<SourcesView {...baseProps} status="pending" />);
    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
    rerender(<SourcesView {...baseProps} status="error" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders the request fields + payload on success', () => {
    render(<SourcesView {...baseProps} status="success" raw={raw} />);
    expect(screen.getByText('/stat/v1/data')).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText(/"metrics"/)).toBeInTheDocument();
  });
});

describe('Sources (data wrapper)', () => {
  beforeEach(() => vi.mocked(api.rawResponse).mockReset());

  it('looks up a raw response by id and renders it', async () => {
    vi.mocked(api.rawResponse).mockResolvedValue(raw);
    renderWithProviders(<Sources />);
    fireEvent.change(screen.getByLabelText('raw_response_id'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Показать' }));
    expect(await screen.findByText('/stat/v1/data')).toBeInTheDocument();
    expect(api.rawResponse).toHaveBeenCalledWith(1);
  });
});
