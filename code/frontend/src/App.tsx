import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { queryClient } from './lib/query';
import { Layout } from './components/Layout';
import { Overview } from './routes/overview';
import { Traffic } from './routes/traffic';
import { Audience } from './routes/audience';
import { B2b } from './routes/b2b';
import { Hypotheses } from './routes/hypotheses';
import { Decisions } from './routes/decisions';
import { ReportPreview } from './routes/report-preview';
import { Funnel } from './routes/funnel';

export function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="traffic" element={<Traffic />} />
            <Route path="audience" element={<Audience />} />
            <Route path="b2b" element={<B2b />} />
            <Route path="funnel" element={<Funnel />} />
            <Route path="hypotheses" element={<Hypotheses />} />
            <Route path="decisions" element={<Decisions />} />
            <Route path="report" element={<ReportPreview />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
