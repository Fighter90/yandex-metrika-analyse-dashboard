import { useQuery } from '@tanstack/react-query';
import type { ChannelStat } from '@pca/shared';
import { api } from '../lib/api';
import { useFilters } from '../store/filters';
import { formatInt, formatPercent } from '../lib/format';
import { dailySeries, weekOverWeek, trendsOption } from '../lib/trends';
import { visitsHeatmapOption } from '../lib/heatmap';
import { EChart } from '../components/charts/EChart';
import { EmptyState } from '../components/EmptyState';
import type { QueryStatus } from '../lib/query-status';

function WowStat({
  label,
  current,
  delta,
}: {
  label: string;
  current: number;
  delta: number;
}): JSX.Element {
  const up = delta >= 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{formatInt(current)}</div>
      <div className={`mt-1 text-xs ${up ? 'text-green-600' : 'text-red-600'}`}>
        {up ? '▲' : '▼'} {formatPercent(Math.abs(delta))} WoW
      </div>
    </div>
  );
}

/** Pure presentational Trends view: daily visits/reaches line + week-over-week deltas. */
export function TrendsView({
  status,
  stats,
}: {
  status: QueryStatus;
  stats: ChannelStat[];
}): JSX.Element {
  if (status === 'pending') return <p className="text-slate-500">Загрузка…</p>;
  if (status === 'error')
    return (
      <p role="alert" className="text-red-600">
        Не удалось загрузить тренды.
      </p>
    );

  if (stats.length === 0) return <EmptyState />;

  const series = dailySeries(stats);
  const wow = weekOverWeek(stats);
  return (
    <section className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <WowStat label="Визиты (7 дней)" current={wow.currentVisits} delta={wow.visitsDelta} />
        <WowStat label="Заявки (7 дней)" current={wow.currentReaches} delta={wow.reachesDelta} />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">Динамика по дням</h2>
        <EChart option={trendsOption(series)} />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">Тепловая карта визитов (канал × дата)</h2>
        <EChart option={visitsHeatmapOption(stats)} />
        <p className="mt-2 text-xs text-slate-500">
          Цвет ячейки — число визитов канала в этот день (когортный retention недоступен: Метрика
          отдаёт только дневные агрегаты без возвратов по пользователям/сессиям). Видно всплески и
          провалы трафика по каналам во времени.
        </p>
      </div>
    </section>
  );
}

/** Data wrapper. */
export function Trends(): JSX.Element {
  const { from, to } = useFilters();
  const q = useQuery({
    queryKey: ['channels', from, to],
    queryFn: () => api.channels({ from, to }),
  });
  return <TrendsView status={q.status} stats={q.data ?? []} />;
}
