import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import type { GeneratedHypotheses, ProblemHypothesis, SolutionHypothesis } from '@pca/shared';
import { api } from '../lib/api';
import { useFilters } from '../store/filters';
import { errorMessage } from '../lib/error-message';
import { parseHypothesisSeed, hasSeed, type HypothesisSeed } from '../lib/hypothesis-prefill';

export type GenStatus = 'idle' | 'pending' | 'error' | 'success';

// ─── Sub-components ──────────────────────────────────────────────────────────

function IceBadge({ score }: { readonly score: number }): JSX.Element {
  const cls =
    score >= 500
      ? 'bg-red-300 text-red-900'
      : score >= 200
        ? 'bg-orange-200 text-orange-900'
        : score >= 50
          ? 'bg-yellow-200 text-yellow-900'
          : 'bg-slate-200 text-slate-700';
  return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>{score}</span>;
}

function ProblemCard({ p }: { readonly p: ProblemHypothesis }): JSX.Element {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-1">
      <div className="flex items-center gap-2">
        <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">
          {p.id}
        </span>
        <span className="text-xs text-slate-500">Проблема</span>
      </div>
      <p className="text-sm font-medium text-slate-800">
        <span className="font-semibold">{p.segment}</span> испытывает{' '}
        <span className="italic">{p.trouble}</span> при <span className="italic">{p.action}</span>,
        потому что <span className="italic">{p.barrier}</span>
      </p>
      <p className="text-xs text-slate-500">
        <span className="font-medium">Обоснование:</span> {p.evidence}
      </p>
    </div>
  );
}

function SolutionCard({ s }: { readonly s: SolutionHypothesis }): JSX.Element {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">
          {s.id}
        </span>
        <span className="text-xs text-slate-500">→ {s.problemId}</span>
        <IceBadge score={s.ice.score} />
        <span className="text-xs text-slate-400">
          I={s.ice.impact} × C={s.ice.confidence} × E={s.ice.ease}
        </span>
      </div>

      <p className="text-sm font-medium text-slate-800">
        Если <span className="italic">{s.action}</span>, то пользователи смогут{' '}
        <span className="italic">{s.userBenefit}</span>, что приведёт к{' '}
        <span className="italic">{s.businessResult}</span>
      </p>

      <p className="text-xs text-slate-600">
        <span className="font-medium">Критерий успеха:</span> {s.successCriteria}
      </p>

      <div className="space-y-0.5">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Риски</p>
        {s.risks.map((r) => (
          <p key={r.kind} className="text-xs text-slate-600">
            <span className="font-medium capitalize">{r.kind}:</span> {r.note}
          </p>
        ))}
      </div>

      <div className="space-y-0.5">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">План проверки</p>
        <p className="text-xs text-slate-600">
          <span className="font-medium">Что проверяем:</span> {s.validation.whatToVerify}
        </p>
        <p className="text-xs text-slate-600">
          <span className="font-medium">Методы:</span> {s.validation.methods.join(', ')}
        </p>
        <p className="text-xs text-slate-600">
          <span className="font-medium">Аудитория:</span> {s.validation.audience}
        </p>
        <p className="text-xs text-slate-600">
          <span className="font-medium">Канал рекрутинга:</span> {s.validation.channel}
        </p>
        <p className="text-xs text-slate-600">
          <span className="font-medium">Успех:</span> {s.validation.successCriteria}
        </p>
      </div>

      <div className="space-y-0.5 border-t border-slate-100 pt-1">
        <p className="text-xs text-slate-500">
          Impact: {s.ice.impactRationale} · Confidence: {s.ice.confidenceRationale} · Ease:{' '}
          {s.ice.easeRationale}
        </p>
      </div>
    </div>
  );
}

// ─── Pure view ───────────────────────────────────────────────────────────────

export interface HypothesesViewProps {
  readonly status: GenStatus;
  readonly hypotheses: GeneratedHypotheses | undefined;
  readonly genError: string | undefined;
  readonly onGenerate: () => void;
  /** Incoming seed from a «слабое место → гипотеза» deep-link, surfaced as starting context. */
  readonly seed?: HypothesisSeed;
}

/** Read-only «контекст для гипотезы» card built from a deep-link seed. */
function SeedContext({ seed }: { readonly seed: HypothesisSeed }): JSX.Element {
  const rows: ReadonlyArray<readonly [string, string | undefined]> = [
    ['Сегмент', seed.segment],
    ['Проблема', seed.trouble],
    ['Действие', seed.action],
    ['Барьер', seed.barrier],
    ['Данные', seed.evidence],
  ];
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
      <p className="mb-2 font-semibold text-amber-900">Контекст для гипотезы (из слабого места)</p>
      <dl className="space-y-0.5">
        {rows
          .filter(([, value]) => value !== undefined && value !== '')
          .map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <dt className="font-medium text-amber-800">{label}:</dt>
              <dd className="text-amber-900">{value}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

/** Pure presentational view — all states: idle/pending/error/success. */
export function HypothesesView({
  status,
  hypotheses,
  genError,
  onGenerate,
  seed,
}: HypothesesViewProps): JSX.Element {
  const sortedSolutions = hypotheses
    ? [...hypotheses.solutions].sort((a, b) => b.ice.score - a.ice.score)
    : [];

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">AI-гипотезы</h2>
        <button
          type="button"
          onClick={onGenerate}
          disabled={status === 'pending'}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-40"
        >
          {status === 'pending' ? 'Генерирую…' : 'Сгенерировать гипотезы'}
        </button>
      </div>

      {seed && hasSeed(seed) ? <SeedContext seed={seed} /> : null}

      {genError ? (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {genError}
        </p>
      ) : null}

      {status === 'idle' ? (
        <p className="text-slate-500">
          Нажмите «Сгенерировать гипотезы», чтобы получить AI-анализ за выбранный период.
        </p>
      ) : null}

      {status === 'success' && hypotheses ? (
        <>
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-700">
              Проблемы ({hypotheses.problems.length})
            </h3>
            {hypotheses.problems.length === 0 ? (
              <p className="text-sm text-slate-500">Проблем-гипотез не найдено.</p>
            ) : (
              hypotheses.problems.map((p) => <ProblemCard key={p.id} p={p} />)
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-slate-700">
              Решения ({sortedSolutions.length}) — отсортированы по ICE
            </h3>
            {sortedSolutions.length === 0 ? (
              <p className="text-sm text-slate-500">Решений-гипотез не найдено.</p>
            ) : (
              sortedSolutions.map((s) => <SolutionCard key={s.id} s={s} />)
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}

// ─── Data wrapper ─────────────────────────────────────────────────────────────

/** Data + mutation wrapper: builds a snapshot, then generates hypotheses. */
export function Hypotheses(): JSX.Element {
  const { from, to } = useFilters();
  const [searchParams] = useSearchParams();
  const seed = parseHypothesisSeed(searchParams);
  const buildMut = useMutation({ mutationFn: api.buildSnapshot });
  const genMut = useMutation({
    mutationFn: (snapshotId: string) => api.generateHypotheses(snapshotId),
  });

  const handleGenerate = (): void => {
    buildMut.mutate(
      { from, to },
      {
        onSuccess: (snapshot) => {
          genMut.mutate(snapshot.id);
        },
      },
    );
  };

  const isPending = buildMut.isPending || genMut.isPending;
  const error = buildMut.error ?? genMut.error;
  const status: GenStatus = isPending
    ? 'pending'
    : error
      ? 'error'
      : genMut.data
        ? 'success'
        : 'idle';

  return (
    <HypothesesView
      status={status}
      hypotheses={genMut.data?.hypotheses}
      genError={errorMessage(error)}
      onGenerate={handleGenerate}
      seed={seed}
    />
  );
}
