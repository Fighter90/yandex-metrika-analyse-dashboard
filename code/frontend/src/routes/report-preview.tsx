import { useMutation } from '@tanstack/react-query';
import { reportSections, type ReportSnapshot } from '@pca/shared';
import { api } from '../lib/api';
import { useFilters } from '../store/filters';
import { formatInt, formatPercent } from '../lib/format';
import { errorMessage } from '../lib/error-message';
import { downloadFile, reportDownloadUrl } from '../lib/download';
import { useState, useEffect } from 'react';

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}): JSX.Element {
  return (
    <div className="rounded border border-slate-200 p-2">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="text-lg font-bold">{value}</div>
      {hint ? <div className="text-xs text-slate-400">{hint}</div> : null}
    </div>
  );
}

/**
 * On-screen render of the full report — the exact same sections DOCX and PDF produce
 * (via the shared reportSections), so what you read here is byte-for-byte the exported content.
 */
export function ReportFullView({ snapshot }: { snapshot: ReportSnapshot }): JSX.Element {
  const sections = reportSections(snapshot);
  return (
    <article
      aria-label="Полный отчёт"
      className="max-h-[70vh] space-y-4 overflow-auto rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm"
    >
      <p className="text-xs text-slate-500">
        Полный отчёт ({sections.length} разделов) — идентичен экспортируемым DOCX и PDF.
      </p>
      {sections.map((sec, i) => (
        <section key={`${sec.heading}-${i}`} className="space-y-1">
          <h3 className="border-b border-slate-200 pb-1 font-semibold text-slate-800">
            {sec.heading}
          </h3>
          {sec.lines.map((line, j) =>
            line === '' ? (
              <div key={j} className="h-2" />
            ) : (
              <p key={j} className="whitespace-pre-wrap text-slate-600">
                {line}
              </p>
            ),
          )}
        </section>
      ))}
    </article>
  );
}

/** Progress bar component for AI analysis */
function AIProgress({ progress, stage }: { progress: number; stage: string }): JSX.Element {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-violet-700">
        <span>{stage}</span>
        <span className="font-mono">{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-violet-100">
        <div
          className="h-full rounded-full bg-violet-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export interface ReportPreviewProps {
  snapshot: ReportSnapshot | undefined;
  isPending: boolean;
  onBuild: () => void;
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
  onExport,
  insightsPending,
  narrative,
  insightsError,
  onInsights,
}: ReportPreviewProps): JSX.Element {
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStage, setAiStage] = useState('');

  // Simulate progress when AI analysis is pending
  useEffect(() => {
    if (!insightsPending) {
      setAiProgress(0);
      setAiStage('');
      return;
    }

    const stages = [
      'Подготовка данных',
      'Генерация: Краткие итоги',
      'Генерация: Каналы и UTM',
      'Генерация: Аудитория',
      'Генерация: Страницы',
      'Генерация: Воронка и B2B',
      'Генерация: Риски',
      'Генерация: Рекомендации',
      'Генерация: Приоритизация гипотез',
      'Генерация: Гипотезы решений',
      'Генерация: Дорожная карта',
    ];

    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = Math.min(Math.round((step / stages.length) * 100), 99);
      setAiProgress(progress);
      const stageIdx = Math.min(step, stages.length - 1);
      if (stages[stageIdx]) setAiStage(stages[stageIdx]);
    }, 1500);

    return () => clearInterval(interval);
  }, [insightsPending]);

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
          {isPending ? 'Формирую…' : 'Сформировать срез данных'}
        </button>
      </div>

      {snapshot ? (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">
            Срез данных: {snapshot.id} · период {snapshot.period.from} — {snapshot.period.to} ·
            сформирован {snapshot.generatedAt}
          </p>

          {/* KPI strip */}
          <div className="grid grid-cols-4 gap-2">
            <Stat label="Цель" value={formatInt(snapshot.kpi.target)} />
            <Stat
              label="Заявки B2C"
              value={formatInt(snapshot.kpi.b2cApplications)}
              hint="заявка ≠ оплата"
            />
            <Stat label="Оплачено B2B" value={formatInt(snapshot.kpi.b2bPaidTickets)} />
            <Stat label="Gap" value={formatInt(snapshot.kpi.gap)} />
          </div>

          {/* Funnel summary */}
          {snapshot.funnel && (
            <div className="grid grid-cols-4 gap-2">
              <Stat label="Визиты" value={formatInt(snapshot.funnel.visits)} />
              <Stat
                label="Воронка → Заявки"
                value={formatInt(snapshot.funnel.b2cApplications)}
                hint={
                  snapshot.funnel.visits > 0
                    ? `CR ${formatPercent(snapshot.funnel.b2cApplications / snapshot.funnel.visits)}`
                    : undefined
                }
              />
              <Stat label="B2B в работе" value={formatInt(snapshot.funnel.b2bPipelineTickets)} />
              <Stat label="B2B оплачено" value={formatInt(snapshot.funnel.b2bPaidTickets)} />
            </div>
          )}

          {/* B2B summary */}
          {snapshot.b2bSummary && snapshot.b2bSummary.dealsCount > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-700">B2B-пайплайн</h3>
              <p className="text-xs text-slate-600">
                {snapshot.b2bSummary.dealsCount} сделок ·{' '}
                {formatInt(snapshot.b2bSummary.totalTickets)} билетов всего ·{' '}
                {formatInt(snapshot.b2bSummary.paidTickets)} оплачено
              </p>
              <div className="flex gap-2 text-xs text-slate-500">
                {snapshot.b2bSummary.byStage.map((s) => (
                  <span key={s.stage} className="rounded bg-slate-100 px-2 py-0.5">
                    {s.stage}: {s.tickets} ({s.deals})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Data summary */}
          <ul className="text-sm text-slate-600">
            <li>Каналов: {snapshot.channels.length}</li>
            <li>
              AI-гипотез:{' '}
              {snapshot.generatedHypotheses
                ? `${snapshot.generatedHypotheses.problems.length} проблем + ${snapshot.generatedHypotheses.solutions.length} решений`
                : 'не сгенерированы'}
            </li>
            <li>Решений в Decision Log: {snapshot.decisions.length}</li>
          </ul>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBuild}
              disabled={isPending}
              className="rounded border border-slate-400 px-3 py-1 text-sm text-slate-700 disabled:opacity-40"
            >
              {isPending ? 'Перестраиваю…' : 'Перестроить отчёт'}
            </button>
            <button
              type="button"
              onClick={() => onExport(snapshot.id, 'docx')}
              className="rounded border border-indigo-600 px-3 py-1 text-sm text-indigo-700"
            >
              Export DOCX
            </button>
            <button
              type="button"
              onClick={() => onExport(snapshot.id, 'pdf')}
              className="rounded border border-rose-600 px-3 py-1 text-sm text-rose-700"
            >
              Export PDF
            </button>
          </div>

          {/* Optional AI narrative with progress bar */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            {insightsPending ? (
              <div className="space-y-2">
                <AIProgress progress={aiProgress} stage={aiStage} />
                <p className="text-xs text-violet-500">
                  Генерация AI-анализа: 10 разделов, это может занять 1–2 минуты.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onInsights(snapshot.id)}
                className="rounded bg-violet-600 px-3 py-1 text-sm text-white"
              >
                Сгенерировать AI-анализ
              </button>
            )}
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

          <ReportFullView snapshot={snapshot} />
        </div>
      ) : (
        <p className="text-slate-500">
          Нажмите «Сформировать срез данных», чтобы собрать неизменяемый отчёт за выбранный период.
          Гипотезы генерируются автоматически при наличии ANTHROPIC_API_KEY.
        </p>
      )}
    </section>
  );
}

/** Data wrapper: builds/rebuilds a snapshot and downloads DOCX/PDF to the user's computer. */
export function ReportPreview(): JSX.Element {
  const { from, to } = useFilters();
  const buildMut = useMutation({ mutationFn: api.buildSnapshot });
  const insightsMut = useMutation({ mutationFn: api.generateInsights });
  return (
    <ReportPreviewView
      snapshot={buildMut.data}
      isPending={buildMut.isPending}
      onBuild={() => buildMut.mutate({ from, to })}
      onExport={(snapshotId, format) => downloadFile(reportDownloadUrl(snapshotId, format))}
      insightsPending={insightsMut.isPending}
      narrative={insightsMut.data?.narrative}
      insightsError={errorMessage(insightsMut.error)}
      onInsights={(snapshotId) => insightsMut.mutate(snapshotId)}
    />
  );
}
