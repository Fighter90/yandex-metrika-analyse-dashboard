import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { queryClient } from './lib/query';
import { Layout } from './components/Layout';
import { Overview } from './routes/overview';
import { Traffic } from './routes/traffic';
import { Behavior } from './routes/behavior';
import { Funnel } from './routes/funnel';
import { Goals } from './routes/goals';
import { Hypotheses } from './routes/hypotheses';
import { Decisions } from './routes/decisions';
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
            <Route path="hypotheses" element={<Hypotheses />} />
            <Route path="decisions" element={<Decisions />} />
            <Route path="b2b" element={<B2b />} />
            <Route path="report" element={<ReportPreview />} />
            <Route path="history" element={<History />} />
            <Route path="settings" element={<Settings />} />
            <Route path="help" element={<Help />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
