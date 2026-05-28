import { useMutation, useQuery } from '@tanstack/react-query';
import { reportSections, type ReportSnapshot } from '@pca/shared';
import { api } from '../lib/api';
import { useFilters } from '../store/filters';
import { formatInt, formatPercent } from '../lib/format';
import { errorMessage } from '../lib/error-message';
import { downloadFile, reportDownloadUrl } from '../lib/download';
import { useState, useEffect, useRef } from 'react';
import { mdToHtml } from '../lib/md-to-html';

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
      {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
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

/** Render AI analysis narrative as formatted HTML. */
function AINarrativeView({ narrative }: { narrative: string }): JSX.Element {
  return (
    <div className="space-y-1">
      <p className="text-xs text-violet-700">
        AI-анализ (интерпретация поверх точных цифр — проверяйте по данным):
      </p>
      <div
        className="ai-narrative overflow-auto rounded bg-slate-50 p-4 text-sm text-slate-700"
        dangerouslySetInnerHTML={{ __html: mdToHtml(narrative) }}
      />
    </div>
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

// 5 stages matching the backend ANALYSIS_CHUNKS
const AI_STAGES = [
  'Подготовка данных',
  'Генерация: Итог',
  'Генерация: Каналы, UTM и Аудитория',
  'Генерация: Страницы и Воронка',
  'Генерация: Риски и Рекомендации',
  'Генерация: Гипотезы и Дорожная карта',
];

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulate progress when AI analysis is pending
  useEffect(() => {
    if (!insightsPending) {
      setAiProgress(0);
      setAiStage('');
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Start from stage 0
    setAiStage(AI_STAGES[0] ?? '');
    setAiProgress(0);

    let step = 0;
    const totalSteps = AI_STAGES.length;
    // Each step takes ~60 seconds (total ~5-10 minutes for 5 chunks with 6000 tokens)
    const stepDuration = 60000;

    intervalRef.current = setInterval(() => {
      step++;
      if (step >= totalSteps) {
        // Stay at 95% until response arrives (never hit 100% until done)
        setAiProgress(95);
        setAiStage(AI_STAGES[totalSteps - 1] ?? 'Завершение…');
      } else {
        const progress = Math.round((step / totalSteps) * 90);
        setAiProgress(progress);
        const stage = AI_STAGES[step];
        if (stage) setAiStage(stage);
      }
    }, stepDuration);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [insightsPending]);

  // When narrative arrives, snap to 100%
  useEffect(() => {
    if (narrative) {
      setAiProgress(100);
      setAiStage('Готово!');
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [narrative]);

  // When error arrives, show error state
  useEffect(() => {
    if (insightsError) {
      setAiProgress(0);
      setAiStage('Ошибка');
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [insightsError]);

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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                  Генерация AI-анализа: 6 разделов (по 6000 токенов), обычно занимает 5–10 минут.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onInsights(snapshot.id)}
                disabled={!!narrative}
                title={narrative ? 'AI-анализ уже сгенерирован для этого среза' : ''}
                className="rounded bg-violet-600 px-3 py-1 text-sm text-white disabled:opacity-40"
              >
                {narrative ? 'AI-анализ сгенерирован' : 'Сгенерировать AI-анализ'}
              </button>
            )}
            {insightsError ? (
              <p role="alert" className="text-xs text-red-700">
                AI-анализ недоступен: {insightsError}
              </p>
            ) : null}
            {narrative ? <AINarrativeView narrative={narrative} /> : null}
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

  // Check for existing snapshot ID in URL (from History page)
  const searchParams = new URLSearchParams(window.location.search);
  const snapshotId = searchParams.get('snapshot');

  const existingSnapshot = useQuery({
    queryKey: ['snapshot', snapshotId],
    queryFn: () => api.getSnapshot(snapshotId!),
    enabled: !!snapshotId,
  });

  const snapshot = existingSnapshot.data ?? buildMut.data;

  // When viewing from History, use the saved AI narrative if present
  const savedNarrative = snapshot?.aiNarrative;
  const narrative = insightsMut.data?.narrative ?? savedNarrative;
  const insightsPending = insightsMut.isPending;

  return (
    <ReportPreviewView
      snapshot={snapshot}
      isPending={buildMut.isPending}
      onBuild={() => buildMut.mutate({ from, to })}
      onExport={(snapshotId, format) => downloadFile(reportDownloadUrl(snapshotId, format))}
      insightsPending={insightsPending}
      narrative={narrative}
      insightsError={errorMessage(insightsMut.error)}
      onInsights={(snapshotId) => insightsMut.mutate(snapshotId)}
    />
  );
}
