import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReportSnapshot } from '@pca/shared';
import { renderWithProviders } from '../test/utils';

vi.mock('../lib/api', () => ({
  api: { buildSnapshot: vi.fn(), generateInsights: vi.fn() },
}));
vi.mock('../lib/download', () => ({
  downloadFile: vi.fn(),
  reportDownloadUrl: (id: string, format: string) => `/api/report/download/${id}/${format}`,
}));
import { api } from '../lib/api';
import { downloadFile } from '../lib/download';
import { ReportPreviewView, ReportPreview } from './report-preview';

const snapshot: ReportSnapshot = {
  id: 'snap-1',
  generatedAt: 'T',
  period: { from: '2025-01-01', to: '2025-01-07' },
  kpi: { target: 300, b2cApplications: 7, b2bPaidTickets: 20, gap: 280 },
  channels: [],
  hypotheses: { problems: [], solutions: [] },
  decisions: [],
  b2bSummary: { totalTickets: 0, paidTickets: 0, dealsCount: 0, deals: [], byStage: [] },
  funnel: { visits: 0, b2cApplications: 7, b2bPipelineTickets: 0, b2bPaidTickets: 20 },
  breakdowns: { utm: [], geoDevice: [], entryPages: [], exitPages: [] },
};

const snapshotWithData: ReportSnapshot = {
  ...snapshot,
  funnel: { visits: 1000, b2cApplications: 50, b2bPipelineTickets: 15, b2bPaidTickets: 20 },
  b2bSummary: {
    totalTickets: 35,
    paidTickets: 20,
    dealsCount: 2,
    deals: [
      { company: 'BigCorp', tickets: 20, stage: 'paid' },
      { company: 'SmallCo', tickets: 15, stage: 'lead' },
    ],
    byStage: [
      { stage: 'paid', tickets: 20, deals: 1 },
      { stage: 'lead', tickets: 15, deals: 1 },
    ],
  },
};

const baseProps = {
  snapshot: undefined,
  isPending: false,
  onBuild: vi.fn(),
  onExport: vi.fn(),
  insightsPending: false,
  narrative: undefined,
  insightsError: undefined,
  onInsights: vi.fn(),
};

describe('ReportPreviewView', () => {
  it('prompts to build, and the build button reflects pending state', () => {
    const onBuild = vi.fn();
    const { rerender } = render(<ReportPreviewView {...baseProps} onBuild={onBuild} />);
    expect(screen.getByText(/Нажмите «Сформировать срез данных»/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Сформировать срез данных' }));
    expect(onBuild).toHaveBeenCalled();

    rerender(<ReportPreviewView {...baseProps} isPending />);
    expect(screen.getByRole('button', { name: 'Формирую…' })).toBeDisabled();
  });

  it('shows the snapshot summary and triggers DOCX + PDF export', () => {
    const onExport = vi.fn();
    render(<ReportPreviewView {...baseProps} snapshot={snapshot} onExport={onExport} />);
    // Use getAllByText since "Срез данных: snap-1" appears in both header and full report
    expect(screen.getAllByText(/Срез данных: snap-1/).length).toBeGreaterThanOrEqual(1);
    // No goalLabel on the fixture → KPI falls back to «Заявок B2C».
    expect(screen.getByText('Заявок B2C')).toBeInTheDocument();
    expect(screen.getByText(/не сгенерированы/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Export DOCX' }));
    expect(onExport).toHaveBeenCalledWith('snap-1', 'docx');
    fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }));
    expect(onExport).toHaveBeenCalledWith('snap-1', 'pdf');
  });

  it('KPI label follows the snapshot goalLabel (Оплат for a purchase goal)', () => {
    const paidSnapshot = {
      ...snapshot,
      goalLabel: {
        title: 'Оплат',
        isPaid: true,
        showApplicationsCaveat: false,
        showEstimate: false,
      },
    };
    render(<ReportPreviewView {...baseProps} snapshot={paidSnapshot} />);
    expect(screen.getByText('Оплат')).toBeInTheDocument();
    expect(screen.queryByText('Заявок B2C')).not.toBeInTheDocument();
  });

  it('rebuilds the report and reflects pending state', () => {
    const onBuild = vi.fn();
    const { rerender } = render(
      <ReportPreviewView {...baseProps} snapshot={snapshot} onBuild={onBuild} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Перестроить отчёт' }));
    expect(onBuild).toHaveBeenCalled();

    rerender(<ReportPreviewView {...baseProps} snapshot={snapshot} isPending />);
    expect(screen.getByRole('button', { name: 'Перестраиваю…' })).toBeDisabled();
  });

  it('triggers AI insights, shows pending progress, the narrative, and an error', () => {
    const onInsights = vi.fn();
    const { rerender } = render(
      <ReportPreviewView {...baseProps} snapshot={snapshot} onInsights={onInsights} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Сгенерировать AI-анализ' }));
    expect(onInsights).toHaveBeenCalledWith('snap-1');

    // When pending, show progress bar instead of disabled button
    rerender(<ReportPreviewView {...baseProps} snapshot={snapshot} insightsPending />);
    // Progress bar should be visible - check for the progress text specifically
    expect(screen.getByText(/Генерация AI-анализа/)).toBeInTheDocument();
    // Use getAllByText since there may be other percentage elements
    expect(screen.getAllByText(/\d+%/).length).toBeGreaterThanOrEqual(1);

    rerender(
      <ReportPreviewView {...baseProps} snapshot={snapshot} narrative="Итог: рост заявок." />,
    );
    expect(screen.getByText(/Итог: рост заявок\./)).toBeInTheDocument();

    rerender(<ReportPreviewView {...baseProps} snapshot={snapshot} insightsError="нет ключа" />);
    expect(screen.getByRole('alert')).toHaveTextContent(/нет ключа/);
  });

  it('shows funnel summary with CR hint when visits > 0', () => {
    render(<ReportPreviewView {...baseProps} snapshot={snapshotWithData} />);
    expect(screen.getByText('Визиты')).toBeInTheDocument();
    expect(screen.getByText('Воронка → Заявки')).toBeInTheDocument();
    // CR hint appears in the funnel section - use getAllByText since it also appears in report sections
    expect(screen.getAllByText(/CR 5\.0%/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('B2B в работе')).toBeInTheDocument();
    expect(screen.getByText('B2B оплачено')).toBeInTheDocument();
  });

  it('shows B2B summary when there are deals', () => {
    render(<ReportPreviewView {...baseProps} snapshot={snapshotWithData} />);
    // B2B-пайплайн appears in both preview and report sections
    expect(screen.getAllByText('B2B-пайплайн').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/2 сделок/)).toBeInTheDocument();
    expect(screen.getByText(/35 билетов/)).toBeInTheDocument();
    // "paid" appears in multiple places, so use getAllByText
    expect(screen.getAllByText(/paid/).length).toBeGreaterThanOrEqual(1);
  });
});

describe('ReportPreview (wrapper)', () => {
  beforeEach(() => {
    vi.mocked(api.buildSnapshot).mockResolvedValue(snapshot);
  });

  it('builds a snapshot then downloads the DOCX export', async () => {
    renderWithProviders(<ReportPreview />);
    fireEvent.click(screen.getByRole('button', { name: 'Сформировать срез данных' }));
    // Use findAllByText since "Срез данных: snap-1" appears in multiple places
    expect((await screen.findAllByText(/Срез данных: snap-1/)).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('button', { name: 'Export DOCX' }));
    expect(downloadFile).toHaveBeenCalledWith('/api/report/download/snap-1/docx');
  });

  it('generates an AI narrative for the snapshot', async () => {
    vi.mocked(api.generateInsights).mockResolvedValue({ narrative: 'AI: рост заявок' });
    renderWithProviders(<ReportPreview />);
    fireEvent.click(screen.getByRole('button', { name: 'Сформировать срез данных' }));
    expect((await screen.findAllByText(/Срез данных: snap-1/)).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('button', { name: 'Сгенерировать AI-анализ' }));
    expect(await screen.findByText(/AI: рост заявок/)).toBeInTheDocument();
    expect(vi.mocked(api.generateInsights).mock.calls[0]?.[0]).toBe('snap-1');
  });
});
