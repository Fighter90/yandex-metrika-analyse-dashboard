import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

type HealthPayload = { status: string; counterId: number; metrikaTokenPresent: boolean };

function fetchResolving(payload: HealthPayload) {
  return vi.fn().mockResolvedValue({ json: () => Promise.resolve(payload) } as Response);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('<App>', () => {
  it('always shows the KPI target of 300', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    );
    render(<App />);
    expect(screen.getByText(/300\+ платных билетов/)).toBeInTheDocument();
  });

  it('shows the loading state before health resolves', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    );
    render(<App />);
    expect(screen.getByText(/Проверяю/)).toBeInTheDocument();
  });

  it('renders ok health with token present', async () => {
    vi.stubGlobal(
      'fetch',
      fetchResolving({ status: 'ok', counterId: 54280963, metrikaTokenPresent: true }),
    );
    render(<App />);
    expect(await screen.findByText('ok')).toBeInTheDocument();
    expect(screen.getByText('54280963')).toBeInTheDocument();
    expect(screen.getByText('настроен')).toBeInTheDocument();
  });

  it('renders ok health with token absent', async () => {
    vi.stubGlobal(
      'fetch',
      fetchResolving({ status: 'ok', counterId: 1, metrikaTokenPresent: false }),
    );
    render(<App />);
    expect(await screen.findByText(/не задан/)).toBeInTheDocument();
  });

  it('renders the error state with the Error message when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
    render(<App />);
    expect(await screen.findByText(/boom/)).toBeInTheDocument();
  });

  it('falls back to a default message for a non-Error rejection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('weird'));
    render(<App />);
    expect(await screen.findByText(/backend unreachable/)).toBeInTheDocument();
  });
});
