import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatInt } from '../lib/format';

type QueryStatus = 'pending' | 'error' | 'success';

/** Pure presentational History view. */
export function HistoryView({
  status,
  snapshots,
}: {
  status: QueryStatus;
  snapshots: Array<{ id: string; generatedAt: string; dateFrom: string; dateTo: string }>;
}): JSX.Element {
  if (status === 'pending') return <p className="text-slate-500">Загрузка…</p>;
  if (status === 'error')
    return <p role="alert" className="text-red-600">Не удалось загрузить историю отчётов.</p>;

  if (snapshots.length === 0)
    return (
      <div
        role="status"
        className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500"
      >
        Отчётов пока нет. Сформируйте snapshot на странице Report.
      </div>
    );

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">История отчётов</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-1">ID</th>
            <th>Сформирован</th>
            <th>Период</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((s) => (
            <tr key={s.id} className="border-t border-slate-100">
              <td className="py-1 font-mono text-xs">{s.id}</td>
              <td>{new Date(s.generatedAt).toLocaleString('ru-RU')}</td>
              <td>
                {s.dateFrom} — {s.dateTo}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-500">Всего отчётов: {formatInt(snapshots.length)}</p>
    </section>
  );
}

/** Data wrapper. */
export function History(): JSX.Element {
  const q = useQuery({ queryKey: ['snapshots'], queryFn: api.listSnapshots });
  return <HistoryView status={q.status} snapshots={q.data ?? []} />;
}
