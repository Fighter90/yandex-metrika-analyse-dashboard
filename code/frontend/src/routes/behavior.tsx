import { useQuery } from '@tanstack/react-query';
import type { PageStat } from '@pca/shared';
import { api } from '../lib/api';
import { useFilters } from '../store/filters';
import { formatInt, formatPercent } from '../lib/format';
import { pageRows, type PageRow } from '../lib/behavior';
import { combineStatus, type QueryStatus } from '../lib/query-status';

function PageTable({ title, rows }: { title: string; rows: PageRow[] }): JSX.Element {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-1">Страница</th>
            <th>Визиты</th>
            <th>Пользователи</th>
            <th>Отказы</th>
            <th>Заявки</th>
            <th>CR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.page} className="border-t border-slate-100">
              <td className="py-1">{r.page}</td>
              <td>{formatInt(r.visits)}</td>
              <td>{formatInt(r.users)}</td>
              <td>{formatPercent(r.bounceRate)}</td>
              <td>{formatInt(r.goalReaches)}</td>
              <td>{formatPercent(r.conversionRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Pure presentational Behavior view: top entry + exit pages with bounce rate + conversion. */
export function BehaviorView({
  status,
  entry,
  exit,
}: {
  status: QueryStatus;
  entry: PageStat[];
  exit: PageStat[];
}): JSX.Element {
  if (status === 'pending') return <p className="text-slate-500">Загрузка…</p>;
  if (status === 'error')
    return (
      <p role="alert" className="text-red-600">
        Не удалось загрузить поведение.
      </p>
    );

  return (
    <section className="space-y-6">
      <PageTable title="Страницы входа" rows={pageRows(entry)} />
      <PageTable title="Страницы выхода" rows={pageRows(exit)} />
    </section>
  );
}

/** Data wrapper: entry + exit page queries combined into one status. */
export function Behavior(): JSX.Element {
  const { from, to } = useFilters();
  const entry = useQuery({ queryKey: ['pages', from, to], queryFn: () => api.pages({ from, to }) });
  const exit = useQuery({
    queryKey: ['exit-pages', from, to],
    queryFn: () => api.exitPages({ from, to }),
  });
  const status = combineStatus(entry.status, exit.status);
  return <BehaviorView status={status} entry={entry.data ?? []} exit={exit.data ?? []} />;
}
