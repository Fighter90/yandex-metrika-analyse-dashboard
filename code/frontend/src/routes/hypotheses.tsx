import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ASSUMPTION_CATEGORIES,
  VALIDATION_METHOD_TYPES,
  iceBucket,
  iceScore,
  validateHypothesis,
  type Hypothesis,
  type IceBucket,
  type NewHypothesis,
  type ValidationMethodType,
} from '@pca/shared';
import { api } from '../lib/api';
import {
  daysToDeadline,
  emptyForm,
  formToInput,
  type HypothesisForm,
} from '../lib/hypothesis-form';

const BUCKET_CLASS: Record<IceBucket, string> = {
  low: 'bg-slate-200 text-slate-700',
  medium: 'bg-yellow-200 text-yellow-900',
  high: 'bg-orange-200 text-orange-900',
  top: 'bg-red-300 text-red-900',
};

export type QueryStatus = 'pending' | 'error' | 'success';

function IceBadge({ score }: { score: number }): JSX.Element {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${BUCKET_CLASS[iceBucket(score)]}`}>
      {score}
    </span>
  );
}

function HypothesisList({ hypotheses }: { hypotheses: Hypothesis[] }): JSX.Element {
  if (hypotheses.length === 0) return <p className="text-slate-500">Гипотез пока нет.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-slate-500">
          <th className="py-1">#</th>
          <th>Заголовок</th>
          <th>Фаза</th>
          <th>Статус</th>
          <th>ICE</th>
          <th>Дней до дедлайна</th>
        </tr>
      </thead>
      <tbody>
        {hypotheses.map((h) => (
          <tr key={h.id} className="border-t border-slate-100">
            <td className="py-1">{h.id}</td>
            <td>{h.title}</td>
            <td>{h.diamondPhase}</td>
            <td>{h.status}</td>
            <td>
              <IceBadge score={h.iceScore} />
            </td>
            <td>{daysToDeadline(h.deadlineAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}): JSX.Element {
  return (
    <label className="block text-sm">
      {label}
      <input
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 block w-full rounded border border-slate-300 px-2 py-1"
      />
    </label>
  );
}

/** Structured hypothesis editor. Save is gated by the shared validateHypothesis. */
export function HypothesisEditor({
  onCreate,
}: {
  onCreate: (input: NewHypothesis) => void;
}): JSX.Element {
  const [form, setForm] = useState<HypothesisForm>(emptyForm());
  const set = (patch: Partial<HypothesisForm>): void => setForm((f) => ({ ...f, ...patch }));

  const input = formToInput(form);
  const result = validateHypothesis(input);
  const score = iceScore(form.impact, form.confidence, form.ease);

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!result.ok) return;
    onCreate(input);
    setForm(emptyForm());
  };

  const assumptionKey = { behavior: 'behavior', market: 'market', tech: 'tech' } as const;

  return (
    <form aria-label="Новая гипотеза" onSubmit={submit} className="space-y-3">
      <h2 className="text-lg font-semibold">Новая гипотеза (формат Воронковой)</h2>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Subject (ЦА)" value={form.subject} onChange={(v) => set({ subject: v })} />
        <Field label="Action" value={form.action} onChange={(v) => set({ action: v })} />
        <Field label="Solution" value={form.solution} onChange={(v) => set({ solution: v })} />
        <Field
          label="Condition (если)"
          value={form.condition}
          onChange={(v) => set({ condition: v })}
        />
      </div>
      <Field label="Title" value={form.title} onChange={(v) => set({ title: v })} />

      <fieldset className="rounded border border-slate-200 p-2">
        <legend className="text-sm font-medium">Скрытые допущения (≥3, все категории)</legend>
        {ASSUMPTION_CATEGORIES.map((c) => (
          <Field
            key={c}
            label={`Допущение: ${c}`}
            value={form[assumptionKey[c]]}
            onChange={(v) => set({ [assumptionKey[c]]: v })}
          />
        ))}
      </fieldset>

      <fieldset className="rounded border border-slate-200 p-2">
        <legend className="text-sm font-medium">Методы проверки (≥2 разных)</legend>
        <MethodRow
          n={1}
          type={form.method1Type}
          plan={form.method1Plan}
          onType={(t) => set({ method1Type: t })}
          onPlan={(p) => set({ method1Plan: p })}
        />
        <MethodRow
          n={2}
          type={form.method2Type}
          plan={form.method2Plan}
          onType={(t) => set({ method2Type: t })}
          onPlan={(p) => set({ method2Plan: p })}
        />
      </fieldset>

      <div className="grid grid-cols-3 gap-2">
        <IceInput label="Impact" value={form.impact} onChange={(n) => set({ impact: n })} />
        <IceInput
          label="Confidence"
          value={form.confidence}
          onChange={(n) => set({ confidence: n })}
        />
        <IceInput label="Ease" value={form.ease} onChange={(n) => set({ ease: n })} />
        <Field
          label="Impact rationale"
          value={form.impactRationale}
          onChange={(v) => set({ impactRationale: v })}
        />
        <Field
          label="Confidence rationale"
          value={form.confidenceRationale}
          onChange={(v) => set({ confidenceRationale: v })}
        />
        <Field
          label="Ease rationale"
          value={form.easeRationale}
          onChange={(v) => set({ easeRationale: v })}
        />
      </div>
      <p className="text-sm">
        ICE = I × C × E = <IceBadge score={score} />
      </p>

      <div className="grid grid-cols-3 gap-2">
        <Field label="🟢 Green" value={form.green} onChange={(v) => set({ green: v })} />
        <Field label="🟡 Yellow" value={form.yellow} onChange={(v) => set({ yellow: v })} />
        <Field label="🔴 Red" value={form.red} onChange={(v) => set({ red: v })} />
      </div>
      <IceInput
        label="Дней на проверку"
        value={form.deadlineDays}
        onChange={(n) => set({ deadlineDays: n })}
      />

      {result.ok ? null : (
        <ul className="rounded bg-red-50 p-2 text-xs text-red-700" aria-label="Ошибки валидации">
          {result.errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      <button
        type="submit"
        disabled={!result.ok}
        className="rounded bg-indigo-600 px-4 py-1.5 text-white disabled:opacity-40"
      >
        Сохранить гипотезу
      </button>
    </form>
  );
}

function MethodRow({
  n,
  type,
  plan,
  onType,
  onPlan,
}: {
  n: number;
  type: ValidationMethodType;
  plan: string;
  onType: (t: ValidationMethodType) => void;
  onPlan: (p: string) => void;
}): JSX.Element {
  return (
    <div className="flex gap-2">
      <select
        aria-label={`Метод ${n} тип`}
        value={type}
        onChange={(e) => onType(e.target.value as ValidationMethodType)}
        className="rounded border border-slate-300 px-1"
      >
        {VALIDATION_METHOD_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <input
        aria-label={`Метод ${n} план`}
        value={plan}
        onChange={(e) => onPlan(e.target.value)}
        className="flex-1 rounded border border-slate-300 px-2 py-1"
      />
    </div>
  );
}

function IceInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}): JSX.Element {
  return (
    <label className="block text-sm">
      {label}
      <input
        aria-label={label}
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-0.5 block w-full rounded border border-slate-300 px-2 py-1"
      />
    </label>
  );
}

/** Pure view: list + editor. */
export function HypothesesView({
  status,
  hypotheses,
  onCreate,
}: {
  status: QueryStatus;
  hypotheses: Hypothesis[];
  onCreate: (input: NewHypothesis) => void;
}): JSX.Element {
  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">Гипотезы (по ICE)</h2>
        {status === 'pending' ? <p className="text-slate-500">Загрузка…</p> : null}
        {status === 'error' ? (
          <p role="alert" className="text-red-600">
            Не удалось загрузить гипотезы.
          </p>
        ) : null}
        {status === 'success' ? <HypothesisList hypotheses={hypotheses} /> : null}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <HypothesisEditor onCreate={onCreate} />
      </div>
    </section>
  );
}

/** Data + mutation wrapper. */
export function Hypotheses(): JSX.Element {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['hypotheses'], queryFn: () => api.hypotheses() });
  const createMut = useMutation({
    mutationFn: api.createHypothesis,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['hypotheses'] });
    },
  });
  return <HypothesesView status={q.status} hypotheses={q.data ?? []} onCreate={createMut.mutate} />;
}
