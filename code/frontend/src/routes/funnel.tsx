import { useQuery } from '@tanstack/react-query';
import type { ChannelStat, B2bDeal } from '@pca/shared';
import { api } from '../lib/api';
import { useFilters } from '../store/filters';
import { formatInt, formatPercent } from '../lib/format';
import { buildFunnel, funnelOption } from '../lib/funnel';
import { combineStatus, type QueryStatus } from '../lib/query-status';
import { EChart } from '../components/charts/EChart';

/** Pure presentational Funnel — the «заявка ≠ оплата» conversion path across all states. */
export function FunnelView({
  status,
  stats,
  deals,
}: {
  status: QueryStatus;
  stats: ChannelStat[];
  deals: B2bDeal[];
}): JSX.Element {
  if (status === 'pending') return <p className="text-slate-500">Загрузка…</p>;
  if (status === 'error')
    return (
      <p role="alert" className="text-red-600">
        Не удалось загрузить данные. Запустите sync и проверьте backend.
      </p>
    );

  const stages = buildFunnel(stats, deals);
  return (
    <section className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {stages.map((s) => (
          <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-500">{s.label}</div>
            <div className="mt-1 text-2xl font-bold">{formatInt(s.value)}</div>
            <div className="mt-1 text-xs text-slate-400">конверсия {formatPercent(s.fromPrev)}</div>
            {s.hint ? <div className="mt-1 text-xs text-amber-600">{s.hint}</div> : null}
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">Воронка конверсии</h2>
        <EChart option={funnelOption(stages)} />
      </div>
    </section>
  );
}

/** Data wrapper: binds channel + B2B queries to the presentational view. */
export function Funnel(): JSX.Element {
  const { from, to } = useFilters();
  const channels = useQuery({
    queryKey: ['channels', from, to],
    queryFn: () => api.channels({ from, to }),
  });
  const deals = useQuery({ queryKey: ['b2b'], queryFn: api.b2b });
  const status = combineStatus(channels.status, deals.status);
  return <FunnelView status={status} stats={channels.data ?? []} deals={deals.data ?? []} />;
}
