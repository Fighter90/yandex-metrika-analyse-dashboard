import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { queryClient } from './lib/query';
import { Layout } from './components/Layout';
import { Overview } from './routes/overview';
import { Traffic } from './routes/traffic';
import { Behavior } from './routes/behavior';
import { Funnel } from './routes/funnel';
import { Goals } from './routes/goals';
import { B2b } from './routes/b2b';
import { ReportPreview } from './routes/report-preview';
import { History } from './routes/history';
import { Settings } from './routes/settings';
import { Help } from './routes/help';

export function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="traffic" element={<Traffic />} />
            <Route path="behavior" element={<Behavior />} />
            <Route path="funnel" element={<Funnel />} />
            <Route path="goals" element={<Goals />} />
            <Route path="b2b" element={<B2b />} />
            <Route path="report" element={<ReportPreview />} />
            {/* Methodology pages removed (v2.7.0): hypotheses + decisions are now AI-generated
                inside the report. Redirect stale URLs to /report. */}
            <Route path="hypotheses" element={<Navigate to="/report" replace />} />
            <Route path="decisions" element={<Navigate to="/report" replace />} />
            <Route path="history" element={<History />} />
            <Route path="settings" element={<Settings />} />
            <Route path="help" element={<Help />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
