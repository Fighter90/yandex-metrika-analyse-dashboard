import { useMutation } from '@tanstack/react-query';
import type { ReportSnapshot } from '@pca/shared';
import { api } from '../lib/api';
import { useFilters } from '../store/filters';
import { formatInt } from '../lib/format';
import { errorMessage } from '../lib/error-message';

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded border border-slate-200 p-2">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

export interface ReportPreviewProps {
  snapshot: ReportSnapshot | undefined;
  isPending: boolean;
  onBuild: () => void;
  exportPending: boolean;
  exportedPath: string | undefined;
  onExport: (snapshotId: string, format: 'docx' | 'pdf') => void;
  insightsPending: boolean;
  narrative: string | undefined;
  insightsError: string | undefined;
  onInsights: (snapshotId: string) => void;
}

/** Pure preview: the snapshot summary that DOCX/PDF render from, plus export. */
export function ReportPreviewView({
  snapshot,
  isPending,
  onBuild,
  exportPending,
  exportedPath,
  onExport,
  insightsPending,
  narrative,
  insightsError,
  onInsights,
}: ReportPreviewProps): JSX.Element {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Превью отчёта</h2>
        <button
          type="button"
          onClick={onBuild}
          disabled={isPending}
          className="rounded bg-indigo-600 px-3 py-1 text-sm text-white disabled:opacity-40"
        >
          {isPending ? 'Формирую…' : 'Сформировать snapshot'}
        </button>
      </div>

      {snapshot ? (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">
            snapshot {snapshot.id} · период {snapshot.period.from} — {snapshot.period.to} ·
            сформирован {snapshot.generatedAt}
          </p>
          <div className="grid grid-cols-4 gap-2">
            <Stat label="Цель" value={formatInt(snapshot.kpi.target)} />
            <Stat label="Заявки B2C" value={formatInt(snapshot.kpi.b2cApplications)} />
            <Stat label="Оплачено B2B" value={formatInt(snapshot.kpi.b2bPaidTickets)} />
            <Stat label="Gap" value={formatInt(snapshot.kpi.gap)} />
          </div>
          <ul className="text-sm text-slate-600">
            <li>Каналов: {snapshot.channels.length}</li>
            <li>Problem-гипотез: {snapshot.hypotheses.problems.length}</li>
            <li>Solution-гипотез: {snapshot.hypotheses.solutions.length}</li>
            <li>Решений: {snapshot.decisions.length}</li>
          </ul>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onExport(snapshot.id, 'docx')}
              disabled={exportPending}
              className="rounded border border-indigo-600 px-3 py-1 text-sm text-indigo-700 disabled:opacity-40"
            >
              {exportPending ? 'Экспорт…' : 'Export DOCX'}
            </button>
            <button
              type="button"
              onClick={() => onExport(snapshot.id, 'pdf')}
              disabled={exportPending}
              className="rounded border border-rose-600 px-3 py-1 text-sm text-rose-700 disabled:opacity-40"
            >
              {exportPending ? 'Экспорт…' : 'Export PDF'}
            </button>
            {exportedPath ? (
              <span className="text-xs text-green-700">Сохранено: {exportedPath}</span>
            ) : null}
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => onInsights(snapshot.id)}
              disabled={insightsPending}
              className="rounded bg-violet-600 px-3 py-1 text-sm text-white disabled:opacity-40"
            >
              {insightsPending ? 'Анализирую…' : 'Сгенерировать AI-анализ'}
            </button>
            {insightsError ? (
              <p role="alert" className="text-xs text-red-600">
                AI-анализ недоступен: {insightsError}
              </p>
            ) : null}
            {narrative ? (
              <div className="space-y-1">
                <p className="text-xs text-violet-700">
                  AI-анализ (интерпретация поверх точных цифр — проверяйте по данным):
                </p>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-slate-700">
                  {narrative}
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-slate-500">
          Нажмите «Сформировать snapshot», чтобы собрать неизменяемый отчёт за выбранный период.
        </p>
      )}
    </section>
  );
}

/** Data wrapper: builds a snapshot, then exports it to DOCX. */
export function ReportPreview(): JSX.Element {
  const { from, to } = useFilters();
  const buildMut = useMutation({ mutationFn: api.buildSnapshot });
  const exportMut = useMutation({ mutationFn: api.generateReport });
  const insightsMut = useMutation({ mutationFn: api.generateInsights });
  return (
    <ReportPreviewView
      snapshot={buildMut.data}
      isPending={buildMut.isPending}
      onBuild={() => buildMut.mutate({ from, to })}
      exportPending={exportMut.isPending}
      exportedPath={exportMut.data?.filePath}
      onExport={(snapshotId, format) => exportMut.mutate({ snapshotId, format })}
      insightsPending={insightsMut.isPending}
      narrative={insightsMut.data?.narrative}
      insightsError={errorMessage(insightsMut.error)}
      onInsights={(snapshotId) => insightsMut.mutate(snapshotId)}
    />
  );
}
