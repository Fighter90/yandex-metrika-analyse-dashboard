import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { queryClient } from './lib/query';
import { Layout } from './components/Layout';
import { Overview } from './routes/overview';
import { Traffic } from './routes/traffic';
import { Funnel, Hypotheses, Decisions } from './routes/placeholders';

export function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="traffic" element={<Traffic />} />
            <Route path="funnel" element={<Funnel />} />
            <Route path="hypotheses" element={<Hypotheses />} />
            <Route path="decisions" element={<Decisions />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
