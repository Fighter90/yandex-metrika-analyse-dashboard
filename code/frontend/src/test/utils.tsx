import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

/** Render a component tree with QueryClient + Router for tests. */
export function renderWithProviders(ui: ReactElement, route = '/') {
  const client = new QueryClient({
    // onError marks failed queries as handled so RQ v5's internal promise is not flagged as an
    // unhandled rejection; gcTime: 0 avoids a lingering timer (clean, fast teardown).
    queryCache: new QueryCache({ onError: () => {} }),
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(ui, { wrapper });
}
