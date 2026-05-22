import { useMutation } from '@tanstack/react-query';
import type { ReportSnapshot } from '@pca/shared';
import { api } from '../lib/api';
import { useFilters } from '../store/filters';
import { formatInt } from '../lib/format';

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
  onExport: (snapshotId: string) => void;
}

/** Pure preview: the snapshot summary that DOCX/PDF render from, plus export. */
export function ReportPreviewView({
  snapshot,
  isPending,
  onBuild,
  exportPending,
  exportedPath,
  onExport,
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
              onClick={() => onExport(snapshot.id)}
              disabled={exportPending}
              className="rounded border border-indigo-600 px-3 py-1 text-sm text-indigo-700 disabled:opacity-40"
            >
              {exportPending ? 'Экспорт…' : 'Export DOCX'}
            </button>
            {exportedPath ? (
              <span className="text-xs text-green-700">Сохранено: {exportedPath}</span>
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
  return (
    <ReportPreviewView
      snapshot={buildMut.data}
      isPending={buildMut.isPending}
      onBuild={() => buildMut.mutate({ from, to })}
      exportPending={exportMut.isPending}
      exportedPath={exportMut.data?.filePath}
      onExport={(snapshotId) => exportMut.mutate({ snapshotId, format: 'docx' })}
    />
  );
}
