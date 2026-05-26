import { useQuery } from '@tanstack/react-query';
import type { PageStat } from '@pca/shared';
import { api } from '../lib/api';
import { useFilters } from '../store/filters';
import { formatInt, formatPercent } from '../lib/format';
import { pageRows, pageBarOption, type PageRow } from '../lib/behavior';
import { EChart } from '../components/charts/EChart';
import { EmptyState } from '../components/EmptyState';
import { combineStatus, type QueryStatus } from '../lib/query-status';

/** Insight badge with green/red indicator */
function InsightBadge({
  type,
  text,
}: {
  type: 'good' | 'warning' | 'info';
  text: string;
}): JSX.Element {
  const colors =
    type === 'good'
      ? 'bg-green-100 text-green-800'
      : type === 'warning'
        ? 'bg-red-100 text-red-800'
        : 'bg-blue-100 text-blue-800';
  const icon = type === 'good' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${colors}`}>
      {icon} {text}
    </span>
  );
}

/** Compute page insights */
function computePageInsights(pages: PageStat[], type: 'entry' | 'exit'): JSX.Element[] {
  const insights: JSX.Element[] = [];
  if (pages.length === 0) return insights;

  const avgCR = pages.reduce((a, p) => a + p.conversionRate, 0) / pages.length;

  for (const p of pages.slice(0, 10)) {
    // High bounce rate warning
    if (p.bounceRate > 0.6 && p.visits > 30) {
      insights.push(
        <InsightBadge
          key={`bounce-${type}-${p.page}`}
          type="warning"
          text={`Высокий bounce ${formatPercent(p.bounceRate)} на ${p.page} — ${p.visits} визитов теряются`}
        />,
      );
    }
    // Low bounce rate - good
    else if (p.bounceRate < 0.3 && p.visits > 30) {
      insights.push(
        <InsightBadge
          key={`good-bounce-${type}-${p.page}`}
          type="good"
          text={`Низкий bounce ${formatPercent(p.bounceRate)} на ${p.page} — хорошо удерживает`}
        />,
      );
    }

    // High conversion - good
    if (p.conversionRate > avgCR * 1.5 && p.visits > 30) {
      insights.push(
        <InsightBadge
          key={`cr-good-${type}-${p.page}`}
          type="good"
          text={`Высокий CR ${formatPercent(p.conversionRate)} на ${p.page} — выше среднего (${formatPercent(avgCR)})`}
        />,
      );
    }
    // Low conversion with high traffic - problem
    else if (p.conversionRate < avgCR * 0.5 && p.visits > 50) {
      insights.push(
        <InsightBadge
          key={`cr-bad-${type}-${p.page}`}
          type="warning"
          text={`Низкий CR ${formatPercent(p.conversionRate)} на ${p.page} при ${p.visits} визитах — проверить путь к заявке`}
        />,
      );
    }
  }

  return insights;
}

function PageTable({
  title,
  rows,
  insights,
}: {
  title: string;
  rows: PageRow[];
  insights: JSX.Element[];
}): JSX.Element {
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
      {insights.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">{insights}</div>
      )}
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

  if (entry.length === 0 && exit.length === 0) return <EmptyState />;

  const entryRows = pageRows(entry);
  const exitRows = pageRows(exit);
  const entryInsights = computePageInsights(entry, 'entry');
  const exitInsights = computePageInsights(exit, 'exit');

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <EChart option={pageBarOption(entryRows, 'Топ страниц входа')} />
          {entryInsights.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">{entryInsights}</div>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <EChart option={pageBarOption(exitRows, 'Топ страниц выхода')} />
          {exitInsights.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">{exitInsights}</div>
          )}
        </div>
      </div>
      <PageTable title="Страницы входа" rows={entryRows} insights={entryInsights} />
      <PageTable title="Страницы выхода" rows={exitRows} insights={exitInsights} />
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
