import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('./lib/api', () => ({ api: { channels: vi.fn().mockResolvedValue([]) } }));
import { App } from './App';
import { queryClient } from './lib/query';

afterEach(() => queryClient.clear());

describe('<App>', () => {
  it('renders the shell (nav) and the Overview page', async () => {
    render(<App />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    // Overview resolves with [] → KPI strip renders.
    expect(await screen.findByText(/Заявок/)).toBeInTheDocument();
  });
});
