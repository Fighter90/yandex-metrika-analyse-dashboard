import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReportSnapshot } from '@pca/shared';
import { renderWithProviders } from '../test/utils';

vi.mock('../lib/api', () => ({ api: { buildSnapshot: vi.fn(), generateReport: vi.fn() } }));
import { api } from '../lib/api';
import { ReportPreviewView, ReportPreview } from './report-preview';

const snapshot: ReportSnapshot = {
  id: 'snap-1',
  generatedAt: 'T',
  period: { from: '2025-01-01', to: '2025-01-07' },
  kpi: { target: 300, b2cApplications: 7, b2bPaidTickets: 20, gap: 280 },
  channels: [],
  hypotheses: { problems: [], solutions: [] },
  decisions: [],
  breakdowns: { utm: [], geoDevice: [], entryPages: [], exitPages: [] },
};

const baseProps = {
  snapshot: undefined,
  isPending: false,
  onBuild: vi.fn(),
  exportPending: false,
  exportedPath: undefined,
  onExport: vi.fn(),
};

describe('ReportPreviewView', () => {
  it('prompts to build, and the build button reflects pending state', () => {
    const onBuild = vi.fn();
    const { rerender } = render(<ReportPreviewView {...baseProps} onBuild={onBuild} />);
    expect(screen.getByText(/Нажмите «Сформировать snapshot»/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Сформировать snapshot' }));
    expect(onBuild).toHaveBeenCalled();

    rerender(<ReportPreviewView {...baseProps} isPending />);
    expect(screen.getByRole('button', { name: 'Формирую…' })).toBeDisabled();
  });

  it('shows the snapshot summary and triggers DOCX + PDF export', () => {
    const onExport = vi.fn();
    render(<ReportPreviewView {...baseProps} snapshot={snapshot} onExport={onExport} />);
    expect(screen.getByText(/snapshot snap-1/)).toBeInTheDocument();
    expect(screen.getByText('Заявки B2C')).toBeInTheDocument();
    expect(screen.queryByText(/Сохранено/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Export DOCX' }));
    expect(onExport).toHaveBeenCalledWith('snap-1', 'docx');
    fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }));
    expect(onExport).toHaveBeenCalledWith('snap-1', 'pdf');
  });

  it('shows the exported path and disables export while pending', () => {
    const { rerender } = render(
      <ReportPreviewView
        {...baseProps}
        snapshot={snapshot}
        exportedPath="data/reports/snap-1.docx"
      />,
    );
    expect(screen.getByText(/Сохранено: data\/reports\/snap-1\.docx/)).toBeInTheDocument();

    rerender(<ReportPreviewView {...baseProps} snapshot={snapshot} exportPending />);
    const exporting = screen.getAllByRole('button', { name: 'Экспорт…' });
    expect(exporting).toHaveLength(2);
    exporting.forEach((btn) => expect(btn).toBeDisabled());
  });
});

describe('ReportPreview (wrapper)', () => {
  beforeEach(() => {
    vi.mocked(api.buildSnapshot).mockResolvedValue(snapshot);
    vi.mocked(api.generateReport).mockResolvedValue({ filePath: 'data/reports/snap-1.docx' });
  });

  it('builds a snapshot then exports it', async () => {
    renderWithProviders(<ReportPreview />);
    fireEvent.click(screen.getByRole('button', { name: 'Сформировать snapshot' }));
    expect(await screen.findByText(/snapshot snap-1/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Export DOCX' }));
    expect(await screen.findByText(/Сохранено/)).toBeInTheDocument();
    expect(api.generateReport).toHaveBeenCalled();
  });
});
