import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog } from '@headlessui/react';
import { Link } from 'react-router-dom';
import type { ChannelStat, UtmStat } from '@pca/shared';
import { api } from '../lib/api';
import { useFilters } from '../store/filters';
import { formatInt, formatPercent } from '../lib/format';
import {
  channelBarOption,
  channelVisitsVsReachesOption,
  channelRows,
  utmCoverage,
  utmRows,
} from '../lib/traffic';
import { utmSankeyOption } from '../lib/sankey';
import { combineStatus, type QueryStatus } from '../lib/query-status';
import { EChart } from '../components/charts/EChart';
import { Tooltip } from '../components/Tooltip';
import { ChartCaption } from '../components/charts/ChartCaption';
import { EmptyState } from '../components/EmptyState';
import { filterBySegment, filterUtmBySegment } from '../lib/segment-filter';
import { buildHypothesisUrl } from '../lib/hypothesis-prefill';

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

/** Compute channel insights */
function computeChannelInsights(stats: ChannelStat[]): JSX.Element[] {
  const insights: JSX.Element[] = [];
  const rows = channelRows(stats);
  const overallCR =
    rows.reduce((a, r) => a + r.goalReaches, 0) / rows.reduce((a, r) => a + r.visits, 0) || 0;

  for (const r of rows) {
    // High CR - good
    if (r.conversionRate > overallCR * 1.5 && r.visits > 30) {
      insights.push(
        <InsightBadge
          key={`cr-good-${r.channel}`}
          type="good"
          text={`${r.channel}: CR ${formatPercent(r.conversionRate)} — выше среднего (${formatPercent(overallCR)}), масштабировать`}
        />,
      );
    }
    // Low CR with high traffic - problem
    else if (r.conversionRate < overallCR * 0.5 && r.visits > 50) {
      insights.push(
        <span key={`cr-bad-${r.channel}`} className="inline-flex items-center gap-1">
          <InsightBadge
            type="warning"
            text={`${r.channel}: CR ${formatPercent(r.conversionRate)} — ниже среднего при ${r.visits} визитах, проверить качество`}
          />
          <Link
            to={buildHypothesisUrl({
              segment: r.channel,
              trouble: 'низкая конверсия',
              evidence: `CR ${formatPercent(r.conversionRate)} при ${formatInt(r.visits)} визитах`,
            })}
            className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
          >
            → гипотеза
          </Link>
        </span>,
      );
    }
  }

  return insights;
}

/** Compute UTM insights */
function computeUtmInsights(utm: UtmStat[], stats: ChannelStat[]): JSX.Element[] {
  const insights: JSX.Element[] = [];
  const cov = utmCoverage(stats);

  if (cov.ratio >= 0.7) {
    insights.push(
      <InsightBadge
        key="utm-good"
        type="good"
        text={`UTM покрытие ${formatPercent(cov.ratio)} — хорошая атрибуция`}
      />,
    );
  } else {
    insights.push(
      <InsightBadge
        key="utm-bad"
        type="warning"
        text={`UTM покрытие ${formatPercent(cov.ratio)} — часть трафика не атрибутирована`}
      />,
    );
  }

  // Find top performing UTM campaigns
  const utmWithSource = utm.filter((u) => u.utmSource && u.utmSource !== '(none)');
  if (utmWithSource.length > 0) {
    const topCR = utmWithSource.sort((a, b) => b.conversionRate - a.conversionRate)[0];
    if (topCR && topCR.conversionRate > 0.05 && topCR.visits > 30) {
      insights.push(
        <InsightBadge
          key="utm-top"
          type="good"
          text={`Лучшая кампания: ${topCR.utmSource}/${topCR.utmCampaign} — CR ${formatPercent(topCR.conversionRate)}`}
        />,
      );
    }
  }

  return insights;
}

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
  const [sankeyOpen, setSankeyOpen] = useState(false);
  if (status === 'pending') return <p className="text-slate-500">Загрузка…</p>;
  if (status === 'error')
    return (
      <p role="alert" className="text-red-700">
        Не удалось загрузить трафик.
      </p>
    );

  if (stats.length === 0 && utm.length === 0) return <EmptyState />;

  const cov = utmCoverage(stats);
  const rows = channelRows(stats);
  const utmTable = utmRows(utm);
  const channelInsights = computeChannelInsights(stats);
  const utmInsights = computeUtmInsights(utm, stats);

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
        {channelInsights.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">{channelInsights}</div>
        )}
        <ChartCaption
          correct="Визиты по каналам берутся из channel_stats и прослеживаются до raw_responses (Метрика)."
          caveat="Показаны только визиты — высокий трафик не равен продажам (заявка ≠ оплата)."
          advice="Сверяйте с графиком «визиты vs заявки» ниже; масштабируйте каналы с высоким CR, а не с высоким трафиком."
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">
          Каналы — визиты vs заявки (какой трафик конвертит)
        </h2>
        <EChart option={channelVisitsVsReachesOption(rows)} />
        <ChartCaption
          correct="Две серии (визиты и достижения цели) на одной оси — видно реальную конверсию каждого канала."
          caveat="Достижения цели — это заявки, а не оплаченные билеты; оплаты по B2B вносятся вручную."
          advice="Фокусируйтесь на каналах, где заявки растут быстрее визитов — это потенциал роста оплат."
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Поток: источник → кампания → заявки</h2>
          <button
            type="button"
            onClick={() => setSankeyOpen(true)}
            className="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
          >
            ⛶ Развернуть на весь экран
          </button>
        </div>
        <EChart option={utmSankeyOption(utm)} height={460} />
        <ChartCaption
          correct="Толщина связей: источник→кампания — по визитам, кампания→«Заявки» — по достижениям целей (из utm_stats)."
          caveat="Трафик без UTM-меток («(none)») не атрибутируется и выпадает из потока."
          advice="Размечайте все кампании UTM-метками, чтобы покрытие было ≥70% и поток отражал реальную атрибуцию."
        />
      </div>

      {/* Fullscreen Sankey — readable on a large canvas */}
      <Dialog open={sankeyOpen} onClose={() => setSankeyOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="flex h-[90vh] w-[95vw] max-w-[1600px] flex-col rounded-lg bg-white p-4 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold">
                Поток: источник → кампания → заявки
              </Dialog.Title>
              <button
                type="button"
                onClick={() => setSankeyOpen(false)}
                aria-label="Закрыть"
                className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100"
              >
                ✕ Закрыть
              </button>
            </div>
            <div className="min-h-0 flex-1">
              {sankeyOpen && (
                <EChart option={utmSankeyOption(utm)} height={window.innerHeight * 0.78} />
              )}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Каналы — таблица</h2>
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
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">
          <Tooltip text="UTM-покрытие = визиты с UTM-метками / все визиты за период. Чем выше, тем точнее атрибуция источников.">
            UTM-разбивка
          </Tooltip>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
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
        {utmInsights.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{utmInsights}</div>}
      </div>
    </section>
  );
}

/** Data wrapper: channel + UTM queries combined into one status. */
export function Traffic(): JSX.Element {
  const { from, to, segment } = useFilters();
  const channels = useQuery({
    queryKey: ['channels', from, to],
    queryFn: () => api.channels({ from, to }),
  });
  const utm = useQuery({ queryKey: ['utm', from, to], queryFn: () => api.utm({ from, to }) });
  const status = combineStatus(channels.status, utm.status);

  // Apply segment filter
  const allChannels = channels.data ?? [];
  const filteredChannels = filterBySegment(allChannels, segment);
  const filteredUtm = filterUtmBySegment(utm.data ?? [], segment, allChannels);

  return <TrafficView status={status} stats={filteredChannels} utm={filteredUtm} />;
}
