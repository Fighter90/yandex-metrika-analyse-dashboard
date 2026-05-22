import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useFilters } from '../store/filters';
import { formatInt } from '../lib/format';
import { channelMixOption, dailyReachesOption, summarizeChannels } from '../lib/overview';
import { EChart } from '../components/charts/EChart';

export function Overview(): JSX.Element {
  const { from, to } = useFilters();
  const q = useQuery({
    queryKey: ['channels', from, to],
    queryFn: () => api.channels({ from, to }),
  });

  if (q.status === 'pending') return <p className="text-slate-500">Загрузка…</p>;
  if (q.status === 'error')
    return (
      <p role="alert" className="text-red-600">
        Не удалось загрузить данные. Запустите sync и проверьте backend.
      </p>
    );

  const stats = q.data;
  const kpi = summarizeChannels(stats);
  return (
    <section className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Kpi label="Цель (платных билетов)" value={formatInt(kpi.target)} />
        <Kpi label="Заявок (goal reaches)" value={formatInt(kpi.reaches)} hint="заявка ≠ оплата" />
        <Kpi label="Gap до цели" value={formatInt(kpi.gap)} />
      </div>
      <Card title="Заявки по дням">
        <EChart option={dailyReachesOption(stats)} />
      </Card>
      <Card title="Микс каналов (визиты)">
        <EChart option={channelMixOption(stats)} />
      </Card>
    </section>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-amber-600">{hint}</div> : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}
