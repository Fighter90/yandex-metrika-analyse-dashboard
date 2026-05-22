import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ChannelStat } from '@pca/shared';
import { api } from '../lib/api';
import { useFilters } from '../store/filters';
import { formatInt, formatPercent } from '../lib/format';
import {
  channelMixOption,
  dailyReachesOption,
  summarizeChannels,
  weakSpots,
} from '../lib/overview';
import { dailySeries, trendsOption } from '../lib/trends';
import { EChart } from '../components/charts/EChart';

export type QueryStatus = 'pending' | 'error' | 'success';

/** Pure presentational Overview — testable across all states without the data layer. */
export function OverviewView({
  status,
  stats,
  primaryGoalName,
}: {
  status: QueryStatus;
  stats: ChannelStat[];
  primaryGoalName?: string;
}): JSX.Element {
  if (status === 'pending') return <p className="text-slate-500">Загрузка…</p>;
  if (status === 'error')
    return (
      <p role="alert" className="text-red-600">
        Не удалось загрузить данные. Запустите sync и проверьте backend.
      </p>
    );

  const kpi = summarizeChannels(stats);
  const weak = weakSpots(stats);
  return (
    <section className="space-y-6">
      {primaryGoalName ? (
        <p className="rounded border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          KPI-цель определена автоматически: <b>{primaryGoalName}</b> — на её достижениях строятся
          заявки. Чтобы зафиксировать другую, задайте <code>GOAL_ID</code>.
        </p>
      ) : null}
      <div className="grid grid-cols-3 gap-4">
        <Kpi label="Цель (платных билетов)" value={formatInt(kpi.target)} />
        <Kpi label="Заявок (goal reaches)" value={formatInt(kpi.reaches)} hint="заявка ≠ оплата" />
        <Kpi label="Gap до цели" value={formatInt(kpi.gap)} />
      </div>
      <Card title="Визиты и заявки по дням">
        <EChart option={trendsOption(dailySeries(stats))} />
      </Card>
      <Card title="Заявки по дням">
        <EChart option={dailyReachesOption(stats)} />
      </Card>
      <Card title="Микс каналов (визиты)">
        <EChart option={channelMixOption(stats)} />
      </Card>
      <Card title="Слабые места (трафик есть, конверсия ниже средней)">
        {weak.length === 0 ? (
          <p className="text-sm text-slate-500">Нет слабых мест по текущим данным.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {weak.map((w) => (
              <li key={w.channel} className="flex justify-between border-b border-slate-100 py-1">
                <span>{w.channel}</span>
                <span className="text-slate-500">
                  {formatInt(w.visits)} визитов · CR {formatPercent(w.conversionRate)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

/** Data wrapper: binds the channel query to the presentational view. */
export function Overview(): JSX.Element {
  const { from, to } = useFilters();
  const q = useQuery({
    queryKey: ['channels', from, to],
    queryFn: () => api.channels({ from, to }),
  });
  // The auto-detected KPI goal — independent of the date range. Absent (404) → badge hidden.
  const goal = useQuery({ queryKey: ['primary-goal'], queryFn: api.primaryGoal, retry: false });
  return <OverviewView status={q.status} stats={q.data ?? []} primaryGoalName={goal.data?.name} />;
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
