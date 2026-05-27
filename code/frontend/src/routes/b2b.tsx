import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { B2bDeal, B2bStage, NewB2bDeal } from '@pca/shared';
import { api } from '../lib/api';
import { formatInt } from '../lib/format';
import { B2B_STAGES, pipelineSummary } from '../lib/b2b';

export interface B2bHandlers {
  onAdd: (deal: NewB2bDeal) => void;
  onStageChange: (input: { id: number; stage: B2bStage }) => void;
  onRemove: (id: number) => void;
}

/** Pure presentational B2B pipeline page. */
export function B2bView({
  deals,
  onAdd,
  onStageChange,
  onRemove,
}: { deals: B2bDeal[] } & B2bHandlers): JSX.Element {
  const summary = pipelineSummary(deals);
  const [company, setCompany] = useState('');
  const [tickets, setTickets] = useState('');
  const [stage, setStage] = useState<B2bStage>('lead');
  const [tableOpen, setTableOpen] = useState(false);

  // Per-stage totals for the kanban — every stage shown (0 if empty).
  const byStage = B2B_STAGES.map((s) => {
    const ds = deals.filter((d) => d.stage === s);
    return { stage: s, tickets: ds.reduce((a, d) => a + d.tickets, 0), deals: ds.length };
  });

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!company || !tickets) return;
    onAdd({
      company,
      tickets: Number(tickets),
      stage,
      dateAdded: new Date().toISOString().slice(0, 10),
    });
    setCompany('');
    setTickets('');
  };

  return (
    <section className="space-y-4">
      {/* Kanban — all 4 stages always shown */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {byStage.map((s) => (
          <div key={s.stage} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase text-slate-500">{s.stage}</div>
            <div className="text-lg font-bold">{formatInt(s.tickets)} билетов</div>
            <div className="text-xs text-slate-500">{s.deals} сделок</div>
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-600">
        Всего билетов в пайплайне: <b>{formatInt(summary.totalTickets)}</b> · оплачено (в KPI 300):{' '}
        <b>{formatInt(summary.paidTickets)}</b>
      </p>

      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          Компания
          <input
            aria-label="Компания"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="block rounded border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="text-sm">
          Билеты
          <input
            aria-label="Билеты"
            type="number"
            value={tickets}
            onChange={(e) => setTickets(e.target.value)}
            className="block w-24 rounded border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="text-sm">
          Этап
          <select
            aria-label="Этап новой сделки"
            value={stage}
            onChange={(e) => setStage(e.target.value as B2bStage)}
            className="block rounded border border-slate-300 px-2 py-1"
          >
            {B2B_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded bg-indigo-600 px-3 py-1 text-sm text-white">
          Добавить
        </button>
      </form>

      <button
        type="button"
        onClick={() => setTableOpen(true)}
        className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
      >
        Развернуть полную таблицу ({deals.length})
      </button>

      <Dialog open={tableOpen} onClose={() => setTableOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-y-0 right-0 flex max-w-full">
          <Dialog.Panel className="w-screen max-w-lg overflow-y-auto bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold">B2B-сделки</Dialog.Title>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => setTableOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1">Компания</th>
                  <th>Билеты</th>
                  <th>Этап</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100">
                    <td className="py-1">{d.company}</td>
                    <td>{formatInt(d.tickets)}</td>
                    <td>
                      <select
                        aria-label={`Этап ${d.company}`}
                        value={d.stage}
                        onChange={(e) =>
                          onStageChange({ id: d.id, stage: e.target.value as B2bStage })
                        }
                        className="rounded border border-slate-300 px-1"
                      >
                        {B2B_STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        aria-label={`Удалить ${d.company}`}
                        onClick={() => onRemove(d.id)}
                        className="text-red-600"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Dialog.Panel>
        </div>
      </Dialog>
    </section>
  );
}

/** Data + mutations wrapper. */
export function B2b(): JSX.Element {
  const qc = useQueryClient();
  const invalidate = (): void => {
    void qc.invalidateQueries({ queryKey: ['b2b'] });
  };
  const q = useQuery({ queryKey: ['b2b'], queryFn: () => api.b2b() });
  const addMut = useMutation({ mutationFn: api.createB2b, onSuccess: invalidate });
  const stageMut = useMutation({ mutationFn: api.updateB2bStage, onSuccess: invalidate });
  const removeMut = useMutation({ mutationFn: api.removeB2b, onSuccess: invalidate });

  return (
    <B2bView
      deals={q.data ?? []}
      onAdd={addMut.mutate}
      onStageChange={stageMut.mutate}
      onRemove={removeMut.mutate}
    />
  );
}
