import { useQuery } from '@tanstack/react-query';
import type { ChannelStat, UtmStat } from '@pca/shared';
import { api } from '../lib/api';
import { useFilters } from '../store/filters';
import { formatInt, formatPercent } from '../lib/format';
import { channelBarOption, channelRows, utmCoverage, utmRows } from '../lib/traffic';
import { combineStatus, type QueryStatus } from '../lib/query-status';
import { EChart } from '../components/charts/EChart';

/** Pure presentational Traffic view: channel mix + table, plus the UTM-breakdown table. */
export function TrafficView({
  status,
  stats,
  utm,
}: {
  status: QueryStatus;
  stats: ChannelStat[];
  utm: UtmStat[];
}): JSX.Element {
  if (status === 'pending') return <p className="text-slate-500">Загрузка…</p>;
  if (status === 'error')
    return (
      <p role="alert" className="text-red-600">
        Не удалось загрузить трафик.
      </p>
    );

  const cov = utmCoverage(stats);
  const rows = channelRows(stats);
  const utmTable = utmRows(utm);
  return (
    <section className="space-y-6">
      {cov.low ? (
        <div role="status" className="rounded bg-amber-100 px-3 py-2 text-sm text-amber-800">
          Низкое покрытие UTM: {formatPercent(cov.ratio)} (порог 70%)
        </div>
      ) : null}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">Каналы — визиты</h2>
        <EChart option={channelBarOption(rows)} />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-1">Канал</th>
            <th>Визиты</th>
            <th>Пользователи</th>
            <th>Заявки</th>
            <th>CR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.channel} className="border-t border-slate-100">
              <td className="py-1">{r.channel}</td>
              <td>{formatInt(r.visits)}</td>
              <td>{formatInt(r.users)}</td>
              <td>{formatInt(r.goalReaches)}</td>
              <td>{formatPercent(r.conversionRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">UTM-разбивка</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1">Source</th>
              <th>Medium</th>
              <th>Campaign</th>
              <th>Визиты</th>
              <th>Заявки</th>
              <th>CR</th>
            </tr>
          </thead>
          <tbody>
            {utmTable.map((u) => (
              <tr
                key={`${u.source} ${u.medium} ${u.campaign}`}
                className="border-t border-slate-100"
              >
                <td className="py-1">{u.source}</td>
                <td>{u.medium}</td>
                <td>{u.campaign}</td>
                <td>{formatInt(u.visits)}</td>
                <td>{formatInt(u.goalReaches)}</td>
                <td>{formatPercent(u.conversionRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Data wrapper: channel + UTM queries combined into one status. */
export function Traffic(): JSX.Element {
  const { from, to } = useFilters();
  const channels = useQuery({
    queryKey: ['channels', from, to],
    queryFn: () => api.channels({ from, to }),
  });
  const utm = useQuery({ queryKey: ['utm', from, to], queryFn: () => api.utm({ from, to }) });
  const status = combineStatus(channels.status, utm.status);
  return <TrafficView status={status} stats={channels.data ?? []} utm={utm.data ?? []} />;
}
