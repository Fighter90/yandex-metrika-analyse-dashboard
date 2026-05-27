import { useQuery } from '@tanstack/react-query';
import type { PageStat } from '@pca/shared';
import { api } from '../lib/api';
import { useFilters } from '../store/filters';
import { formatInt, formatPercent } from '../lib/format';
import { pageRows, type PageRow } from '../lib/behavior';
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
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${colors}`}>
      <span className="mr-1">{icon}</span> {text}
    </span>
  );
}

/** Compute page insights with detailed analysis */
function computePageInsights(
  pages: PageStat[],
  type: 'entry' | 'exit',
): { badges: JSX.Element[]; summary: string } {
  const badges: JSX.Element[] = [];
  if (pages.length === 0) return { badges, summary: '' };

  const rows = pageRows(pages);
  const avgBounce = rows.reduce((a, r) => a + r.bounceRate, 0) / rows.length;
  const avgCR = rows.reduce((a, r) => a + r.conversionRate, 0) / rows.length;
  const totalVisits = rows.reduce((a, r) => a + r.visits, 0);
  const totalReaches = rows.reduce((a, r) => a + r.goalReaches, 0);

  // Summary
  const summary =
    type === 'entry'
      ? `${rows.length} страниц входа · ${formatInt(totalVisits)} визитов · ${formatInt(totalReaches)} заявок (CR ${formatPercent(totalVisits > 0 ? totalReaches / totalVisits : 0)})`
      : `${rows.length} страниц выхода · ${formatInt(totalVisits)} визитов · средний отказ ${formatPercent(avgBounce)}`;

  for (const p of rows.slice(0, 10)) {
    // High bounce rate warning
    if (p.bounceRate > 0.5 && p.visits > 30) {
      badges.push(
        <InsightBadge
          key={`bounce-${type}-${p.page}`}
          type="warning"
          text={`Высокий bounce ${formatPercent(p.bounceRate)} на ${p.page} — ${p.visits} визитов теряются`}
        />,
      );
    }
    // Low bounce rate - good
    else if (p.bounceRate < 0.2 && p.visits > 30) {
      badges.push(
        <InsightBadge
          key={`good-bounce-${type}-${p.page}`}
          type="good"
          text={`Низкий bounce ${formatPercent(p.bounceRate)} на ${p.page} — хорошо удерживает`}
        />,
      );
    }

    // High conversion - good
    if (p.conversionRate > avgCR * 1.5 && p.visits > 30) {
      badges.push(
        <InsightBadge
          key={`cr-good-${type}-${p.page}`}
          type="good"
          text={`Высокий CR ${formatPercent(p.conversionRate)} на ${p.page} — выше среднего (${formatPercent(avgCR)})`}
        />,
      );
    }
    // Low conversion with high traffic - problem
    else if (p.conversionRate < avgCR * 0.5 && p.visits > 50) {
      badges.push(
        <InsightBadge
          key={`cr-bad-${type}-${p.page}`}
          type="warning"
          text={`Низкий CR ${formatPercent(p.conversionRate)} на ${p.page} при ${p.visits} визитах`}
        />,
      );
    }
  }

  return { badges, summary };
}

/** Shorten a URL to its path for chart labels */
function shortLabel(page: string): string {
  const path = page.replace(/^https?:\/\/[^/]+/, '');
  return path === '' ? '/' : path;
}

/** ECharts bounce rate bar chart (horizontal) */
function bounceBarOption(rows: PageRow[], title: string): object {
  const top = rows
    .slice(0, 8)
    .sort((a, b) => b.bounceRate - a.bounceRate)
    .reverse();
  return {
    title: { text: title, left: 'center', textStyle: { fontSize: 13 } },
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown[]) => {
        const p = params[0] as { name: string; value: number };
        return `${p.name}<br/>Отказы: ${formatPercent(p.value)}`;
      },
    },
    grid: { left: 140, right: 16, top: 32, bottom: 28 },
    xAxis: {
      type: 'value',
      max: 1,
      axisLabel: { formatter: (v: number) => `${(v * 100).toFixed(0)}%` },
    },
    yAxis: { type: 'category', data: top.map((r) => shortLabel(r.page)) },
    series: [
      {
        name: 'Отказы',
        type: 'bar',
        data: top.map((r) => ({
          value: r.bounceRate,
          itemStyle: {
            color: r.bounceRate > 0.4 ? '#ef4444' : r.bounceRate > 0.25 ? '#f59e0b' : '#22c55e',
          },
        })),
        label: {
          show: true,
          position: 'right',
          formatter: (v: { value: number }) => formatPercent(v.value),
        },
      },
    ],
  };
}

/** ECharts conversion rate bar chart (horizontal) */
function crBarOption(rows: PageRow[], title: string): object {
  const top = rows
    .slice(0, 8)
    .filter((r) => r.visits > 20)
    .sort((a, b) => a.conversionRate - b.conversionRate)
    .reverse();
  return {
    title: { text: title, left: 'center', textStyle: { fontSize: 13 } },
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown[]) => {
        const p = params[0] as { name: string; value: number };
        return `${p.name}<br/>CR: ${formatPercent(p.value)}`;
      },
    },
    grid: { left: 140, right: 16, top: 32, bottom: 28 },
    xAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v * 100).toFixed(0)}%` } },
    yAxis: { type: 'category', data: top.map((r) => shortLabel(r.page)) },
    series: [
      {
        name: 'CR',
        type: 'bar',
        data: top.map((r) => ({
          value: r.conversionRate,
          itemStyle: {
            color:
              r.conversionRate > 0.02
                ? '#22c55e'
                : r.conversionRate > 0.005
                  ? '#f59e0b'
                  : '#ef4444',
          },
        })),
        label: {
          show: true,
          position: 'right',
          formatter: (v: { value: number }) => formatPercent(v.value),
        },
      },
    ],
  };
}

function PageTable({
  title,
  rows,
  type,
}: {
  title: string;
  rows: PageRow[];
  type: 'entry' | 'exit';
}): JSX.Element {
  const avgCR = rows.length > 0 ? rows.reduce((a, r) => a + r.conversionRate, 0) / rows.length : 0;
  const avgBounce = rows.length > 0 ? rows.reduce((a, r) => a + r.bounceRate, 0) / rows.length : 0;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-slate-500">
              <th className="px-3 py-2">Страница</th>
              <th className="px-3 py-2">Визиты</th>
              <th className="px-3 py-2">Пользователи</th>
              <th className="px-3 py-2">Отказы</th>
              <th className="px-3 py-2">Заявки</th>
              <th className="px-3 py-2">CR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const bounceColor =
                r.bounceRate > 0.5
                  ? 'text-red-600'
                  : r.bounceRate > 0.3
                    ? 'text-amber-600'
                    : 'text-green-600';
              const crColor =
                r.conversionRate > avgCR * 1.5
                  ? 'text-green-600'
                  : r.conversionRate < avgCR * 0.5
                    ? 'text-red-600'
                    : 'text-slate-600';
              return (
                <tr key={r.page} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs">{shortLabel(r.page)}</td>
                  <td className="px-3 py-2">{formatInt(r.visits)}</td>
                  <td className="px-3 py-2">{formatInt(r.users)}</td>
                  <td className={`px-3 py-2 font-medium ${bounceColor}`}>
                    {formatPercent(r.bounceRate)}
                  </td>
                  <td className="px-3 py-2">{formatInt(r.goalReaches)}</td>
                  <td className={`px-3 py-2 font-medium ${crColor}`}>
                    {formatPercent(r.conversionRate)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > 0 && (
        <div className="rounded bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Средние: отказы {formatPercent(avgBounce)} · CR {formatPercent(avgCR)} ·{' '}
          {type === 'entry'
            ? 'Страницы отсортированы по визитам'
            : 'Страницы отсортированы по визитам'}
        </div>
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
  const { badges: entryBadges, summary: entrySummary } = computePageInsights(entry, 'entry');
  const { summary: exitSummary } = computePageInsights(exit, 'exit');

  // Summary stats
  const totalEntryVisits = entryRows.reduce((a, r) => a + r.visits, 0);
  const totalEntryReaches = entryRows.reduce((a, r) => a + r.goalReaches, 0);
  const entryCR = totalEntryVisits > 0 ? totalEntryReaches / totalEntryVisits : 0;
  const avgEntryBounce =
    entryRows.length > 0 ? entryRows.reduce((a, r) => a + r.bounceRate, 0) / entryRows.length : 0;

  // Find best and worst pages
  const bestPage =
    entryRows.length > 0
      ? entryRows.reduce(
          (best, r) => (r.conversionRate > best.conversionRate ? r : best),
          entryRows[0]!,
        )
      : null;
  const worstPage =
    entryRows.length > 0
      ? entryRows.reduce((worst, r) => (r.bounceRate > worst.bounceRate ? r : worst), entryRows[0]!)
      : null;

  return (
    <section className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Страниц входа</div>
          <div className="text-2xl font-bold">{entryRows.length}</div>
          {entrySummary && <div className="mt-1 text-xs text-slate-400">{entrySummary}</div>}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Визитов</div>
          <div className="text-2xl font-bold">{formatInt(totalEntryVisits)}</div>
          <div className="mt-1 text-xs text-slate-400">CR {formatPercent(entryCR)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Средний bounce</div>
          <div
            className={`text-2xl font-bold ${avgEntryBounce > 0.3 ? 'text-red-600' : avgEntryBounce > 0.2 ? 'text-amber-600' : 'text-green-600'}`}
          >
            {formatPercent(avgEntryBounce)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {avgEntryBounce > 0.3 ? '⚠️ Высокий' : '✅ В норме'}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Страниц выхода</div>
          <div className="text-2xl font-bold">{exitRows.length}</div>
          {exitSummary && <div className="mt-1 text-xs text-slate-400">{exitSummary}</div>}
        </div>
      </div>

      {/* Key insights */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Ключевые наблюдения</h3>
        <div className="flex flex-wrap gap-2">
          {bestPage && bestPage.conversionRate > 0.01 && (
            <InsightBadge
              type="good"
              text={`Лучший CR: ${shortLabel(bestPage.page)} ${formatPercent(bestPage.conversionRate)}`}
            />
          )}
          {worstPage && worstPage.bounceRate > 0.4 && (
            <InsightBadge
              type="warning"
              text={`Худший bounce: ${shortLabel(worstPage.page)} ${formatPercent(worstPage.bounceRate)}`}
            />
          )}
          {entryCR > 0.02 ? (
            <InsightBadge type="good" text={`Общий CR ${formatPercent(entryCR)} — хороший`} />
          ) : (
            <InsightBadge
              type="warning"
              text={`Общий CR ${formatPercent(entryCR)} — низкий, цель > 2%`}
            />
          )}
          {entryBadges.slice(0, 3)}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <EChart option={crBarOption(entryRows, 'Конверсия страниц входа')} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <EChart option={bounceBarOption(entryRows, 'Отказы страниц входа')} />
        </div>
      </div>

      {/* Exit page chart */}
      {exitRows.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <EChart option={bounceBarOption(exitRows, 'Отказы страниц выхода')} />
        </div>
      )}

      {/* Tables */}
      <PageTable title="Страницы входа" rows={entryRows} type="entry" />
      {exitRows.length > 0 && <PageTable title="Страницы выхода" rows={exitRows} type="exit" />}

      {/* Recommendations */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Рекомендации</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          {worstPage && worstPage.bounceRate > 0.4 && (
            <li className="flex items-start gap-2">
              <span className="text-red-500">🔴</span>
              <span>
                <b>{shortLabel(worstPage.page)}</b> — bounce {formatPercent(worstPage.bounceRate)}.
                Упростить контент, добавить CTA, проверить мобильную версию.
              </span>
            </li>
          )}
          {entryCR < 0.02 && (
            <li className="flex items-start gap-2">
              <span className="text-amber-500">🟡</span>
              <span>
                Общий CR {formatPercent(entryCR)} ниже 2%. Добавить формы захвата на страницы с
                высоким трафиком, упростить навигацию.
              </span>
            </li>
          )}
          {entryCR >= 0.02 && (
            <li className="flex items-start gap-2">
              <span className="text-green-500">🟢</span>
              <span>
                CR {formatPercent(entryCR)} на хорошем уровне. Масштабировать трафик на страницы с
                лучшим CR.
              </span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <span className="text-blue-500">ℹ️</span>
            <span>А/B-тестировать посадочные страницы с bounce &gt; 30% и визитов &gt; 100.</span>
          </li>
        </ul>
      </div>
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
