import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ChannelStat, GeoDeviceStat, UtmStat, PageStat, B2bDeal } from '@pca/shared';
import { api } from '../lib/api';
import { useFilters } from '../store/filters';
import { formatInt, formatPercent } from '../lib/format';
import { EmptyState } from '../components/EmptyState';
import { channelMixOption, summarizeChannels, weakSpots } from '../lib/overview';
import { utmCoverage } from '../lib/traffic';
import { dailySeries, trendsOption } from '../lib/trends';
import { byCountry, byDevice, audienceBarOption, deviceShareOption } from '../lib/audience';
import { EChart } from '../components/charts/EChart';
import { ChartCaption } from '../components/charts/ChartCaption';
import { filterBySegment, filterUtmBySegment } from '../lib/segment-filter';
import { buildHypothesisUrl } from '../lib/hypothesis-prefill';
import { shouldShowOnboarding, markOnboarded } from '../lib/onboarding';
import { weeklyDigest } from '../lib/weekly-digest';
import { Tooltip } from '../components/Tooltip';
import { formatGoalLabel, type GoalLabel } from '@pca/shared';

export type QueryStatus = 'pending' | 'error' | 'success';

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

/** Compute insights from channel data */
function computeChannelInsights(stats: ChannelStat[]): JSX.Element[] {
  const insights: JSX.Element[] = [];
  const totalVisits = stats.reduce((a, c) => a + c.visits, 0);
  const totalApplications = stats.reduce((a, c) => a + c.goalReaches, 0);
  const overallCR = totalVisits > 0 ? totalApplications / totalVisits : 0;

  // Overall conversion assessment
  if (overallCR > 0.05) {
    insights.push(
      <InsightBadge
        key="cr-good"
        type="good"
        text={`Общий CR ${formatPercent(overallCR)} — выше 5% (хорошо)`}
      />,
    );
  } else if (overallCR < 0.02) {
    insights.push(
      <InsightBadge
        key="cr-bad"
        type="warning"
        text={`Общий CR ${formatPercent(overallCR)} — ниже 2% (проблема)`}
      />,
    );
  }

  // Find best and worst channels
  const channelCRs = stats.reduce<Map<string, { visits: number; reaches: number }>>((acc, c) => {
    const cur = acc.get(c.channel) ?? { visits: 0, reaches: 0 };
    acc.set(c.channel, { visits: cur.visits + c.visits, reaches: cur.reaches + c.goalReaches });
    return acc;
  }, new Map());

  for (const [channel, data] of channelCRs) {
    const cr = data.visits > 0 ? data.reaches / data.visits : 0;
    if (cr > overallCR * 1.5 && data.visits > 50) {
      insights.push(
        <InsightBadge
          key={`good-${channel}`}
          type="good"
          text={`${channel}: CR ${formatPercent(cr)} — значительно выше среднего (масштабировать)`}
        />,
      );
    } else if (cr < overallCR * 0.5 && data.visits > 50) {
      insights.push(
        <InsightBadge
          key={`bad-${channel}`}
          type="warning"
          text={`${channel}: CR ${formatPercent(cr)} — значительно ниже среднего (проверить качество)`}
        />,
      );
    }
  }

  return insights;
}

/** Compute UTM insights from the single coverage factsource (utmCoverage over channel rows). */
function computeUtmInsights(stats: ChannelStat[]): JSX.Element[] {
  const insights: JSX.Element[] = [];
  if (stats.length === 0) return insights;

  const coverage = utmCoverage(stats).ratio * 100;

  if (coverage >= 70) {
    insights.push(
      <InsightBadge
        key="utm-good"
        type="good"
        text={`UTM покрытие ${coverage.toFixed(0)}% — хорошая атрибуция`}
      />,
    );
  } else {
    insights.push(
      <InsightBadge
        key="utm-bad"
        type="warning"
        text={`UTM покрытие ${coverage.toFixed(0)}% — часть трафика не атрибутирована`}
      />,
    );
  }

  return insights;
}

/** Compute page insights */
function computePageInsights(pages: PageStat[] | undefined, type: 'entry' | 'exit'): JSX.Element[] {
  const insights: JSX.Element[] = [];
  if (!pages || pages.length === 0) return insights;

  for (const p of pages.slice(0, 5)) {
    if (p.bounceRate > 0.7 && p.visits > 50) {
      insights.push(
        <InsightBadge
          key={`bounce-${type}-${p.page}`}
          type="warning"
          text={`Высокий bounce ${formatPercent(p.bounceRate)} на ${p.page} (${p.visits} визитов)`}
        />,
      );
    } else if (p.bounceRate < 0.3 && p.visits > 50) {
      insights.push(
        <InsightBadge
          key={`good-${type}-${p.page}`}
          type="good"
          text={`Низкий bounce ${formatPercent(p.bounceRate)} на ${p.page} — хорошо удерживает`}
        />,
      );
    }
  }

  return insights;
}

/** Compute geo insights */
function computeGeoInsights(geoDevice: GeoDeviceStat[] | undefined): JSX.Element[] {
  const insights: JSX.Element[] = [];
  if (!geoDevice || geoDevice.length === 0) return insights;

  const byCountry = geoDevice.reduce<Map<string, { visits: number; reaches: number }>>((acc, g) => {
    const cur = acc.get(g.country) ?? { visits: 0, reaches: 0 };
    acc.set(g.country, { visits: cur.visits + g.visits, reaches: cur.reaches + g.goalReaches });
    return acc;
  }, new Map());

  for (const [country, data] of byCountry) {
    const cr = data.visits > 0 ? data.reaches / data.visits : 0;
    if (cr > 0.1 && data.visits > 50) {
      insights.push(
        <InsightBadge
          key={`geo-good-${country}`}
          type="good"
          text={`${country}: CR ${formatPercent(cr)} — высокая конверсия`}
        />,
      );
    } else if (cr < 0.02 && data.visits > 100) {
      insights.push(
        <InsightBadge
          key={`geo-bad-${country}`}
          type="warning"
          text={`${country}: CR ${formatPercent(cr)} — низкая конверсия при большом трафике`}
        />,
      );
    }
  }

  return insights;
}

/** Pure presentational Overview — testable across all states without the data layer. */
export function OverviewView({
  status,
  stats,
  b2bDeals,
  primaryGoalName,
  goalLabel,
  geoDevice,
  utm,
  entryPages,
  exitPages,
}: {
  status: QueryStatus;
  stats: ChannelStat[];
  b2bDeals?: B2bDeal[];
  primaryGoalName?: string;
  goalLabel?: GoalLabel;
  geoDevice?: GeoDeviceStat[];
  utm?: UtmStat[];
  entryPages?: PageStat[];
  exitPages?: PageStat[];
}): JSX.Element {
  if (status === 'pending') return <p className="text-slate-500">Загрузка…</p>;
  if (status === 'error')
    return (
      <p role="alert" className="text-red-600">
        Не удалось загрузить данные. Запустите sync и проверьте backend.
      </p>
    );

  if (stats.length === 0) return <EmptyState />;

  const kpi = summarizeChannels(stats, b2bDeals ?? []);
  const weak = weakSpots(stats);
  const geoRows = geoDevice ? byCountry(geoDevice) : [];
  const devRows = geoDevice ? byDevice(geoDevice) : [];
  const hasGeo = geoRows.length > 0 && devRows.length > 0;

  // UTM coverage — single source: utmCoverage(channels) from lib/traffic (share of channel rows
  // carrying a utm_source). Overview and Traffic now report the same number from the same source.
  const utmCov = utmCoverage(stats);
  const utmCoveragePct = (utmCov.ratio * 100).toFixed(0);
  const lowUtm = utmCov.low;

  // Top entry pages
  const topEntry = (entryPages ?? []).sort((a, b) => b.visits - a.visits).slice(0, 5);
  const topExit = (exitPages ?? []).sort((a, b) => b.visits - a.visits).slice(0, 5);

  // Compute insights
  const channelInsights = computeChannelInsights(stats);
  const utmInsights = computeUtmInsights(stats);
  const entryInsights = computePageInsights(entryPages, 'entry');
  const exitInsights = computePageInsights(exitPages, 'exit');
  const geoInsights = computeGeoInsights(geoDevice);

  return (
    <section className="space-y-6">
      {primaryGoalName ? (
        <p className="rounded border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          KPI-цель определена автоматически: <b>{primaryGoalName}</b> — на её достижениях строятся
          заявки. Чтобы зафиксировать другую, задайте <code>GOAL_ID</code>.
        </p>
      ) : null}

      {lowUtm ? (
        <div role="status" className="rounded bg-amber-100 px-3 py-2 text-sm text-amber-800">
          Низкое покрытие UTM: {utmCoveragePct}% (порог 70%) — часть трафика не атрибутирована.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Цель (платных билетов)" value={formatInt(kpi.target)} />
        <Kpi
          label={goalLabel?.title ?? 'Заявок B2C'}
          value={formatInt(kpi.applications)}
          hint={goalLabel?.showApplicationsCaveat === false ? undefined : 'заявка ≠ оплата'}
        />
        <Kpi label="Оплачено B2B" value={formatInt(kpi.b2bPaid)} />
        <Kpi
          label="Gap до цели"
          value={formatInt(kpi.gap)}
          hint={`${formatInt(kpi.b2bPaid)} оплачено из ${formatInt(kpi.target)}`}
        />
      </div>

      <WeeklyDigest stats={stats} />

      <Card title="Визиты и заявки по дням">
        <EChart option={trendsOption(dailySeries(stats))} />
        {channelInsights.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">{channelInsights}</div>
        )}
        <ChartCaption
          correct="Две линии (визиты и заявки) по дням из channel_stats — видна динамика и совпадение всплесков."
          caveat="Заявки на порядок меньше визитов — на общей оси линия заявок может казаться плоской."
          advice="Смотрите не на абсолют, а на синхронность всплесков: рост визитов без роста заявок — сигнал к проверке трафика."
        />
      </Card>

      <Card title="Микс каналов (визиты)">
        <EChart option={channelMixOption(stats)} />
        <ChartCaption
          correct="Доли визитов по каналам из channel_stats — структура источников трафика."
          caveat="Это доли визитов, не оплат; крупный по визитам канал может почти не давать продаж."
          advice="Сопоставляйте с воронкой по каналам — оценивайте вклад в заявки, а не только размер."
        />
      </Card>

      {hasGeo ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Топ стран по визитам">
            <EChart option={audienceBarOption(geoRows, '')} />
            {geoInsights.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">{geoInsights}</div>
            )}
            <ChartCaption
              correct="Топ стран по визитам из geo_device_stats — где находится аудитория."
              caveat="Гео определяется по IP; VPN и роуминг могут искажать распределение."
              advice="Проверяйте CR ключевых стран в воронке — больше визитов не всегда означает больше оплат."
            />
          </Card>
          <Card title="Доля устройств (визиты)">
            <EChart option={deviceShareOption(devRows)} />
            <ChartCaption
              correct="Доли desktop/mobile/tablet по визитам из geo_device_stats."
              caveat="Доля устройств по визитам не равна доле по оплатам — мобильные часто конвертят хуже."
              advice="Если mobile даёт большую долю визитов, проверьте мобильную версию лендинга и форм."
            />
          </Card>
        </div>
      ) : null}

      {/* UTM breakdown */}
      {utm && utm.length > 0 && (
        <Card title={`UTM-разбивка (покрытие ${utmCoveragePct}%)`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
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
                {utm
                  .sort((a, b) => b.visits - a.visits)
                  .slice(0, 10)
                  .map((u) => (
                    <tr
                      key={`${u.utmSource}-${u.utmMedium}-${u.utmCampaign}`}
                      className="border-t border-slate-100"
                    >
                      <td className="py-1">{u.utmSource ?? '(none)'}</td>
                      <td>{u.utmMedium ?? '(none)'}</td>
                      <td>{u.utmCampaign ?? '(none)'}</td>
                      <td>{formatInt(u.visits)}</td>
                      <td>{formatInt(u.goalReaches)}</td>
                      <td>{formatPercent(u.conversionRate)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {utmInsights.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{utmInsights}</div>}
        </Card>
      )}

      {/* Entry pages */}
      {topEntry.length > 0 && (
        <Card title="Топ страниц входа">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1">Страница</th>
                  <th>Визиты</th>
                  <th>Отказы</th>
                  <th>Заявки</th>
                </tr>
              </thead>
              <tbody>
                {topEntry.map((p) => (
                  <tr key={p.page} className="border-t border-slate-100">
                    <td className="py-1">{p.page}</td>
                    <td>{formatInt(p.visits)}</td>
                    <td>{formatPercent(p.bounceRate)}</td>
                    <td>{formatInt(p.goalReaches)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {entryInsights.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">{entryInsights}</div>
          )}
        </Card>
      )}

      {/* Exit pages */}
      {topExit.length > 0 && (
        <Card title="Топ страниц выхода">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1">Страница</th>
                  <th>Визиты</th>
                  <th>Отказы</th>
                  <th>Заявки</th>
                </tr>
              </thead>
              <tbody>
                {topExit.map((p) => (
                  <tr key={p.page} className="border-t border-slate-100">
                    <td className="py-1">{p.page}</td>
                    <td>{formatInt(p.visits)}</td>
                    <td>{formatPercent(p.bounceRate)}</td>
                    <td>{formatInt(p.goalReaches)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {exitInsights.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">{exitInsights}</div>
          )}
        </Card>
      )}

      <Card title="Слабые места (трафик есть, конверсия ниже средней)">
        {weak.length === 0 ? (
          <p className="text-sm text-slate-500">Нет слабых мест по текущим данным.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {weak.map((w) => (
              <li key={w.channel} className="flex justify-between border-b border-slate-100 py-1">
                <span>{w.channel}</span>
                <span className="flex items-center gap-3">
                  <span className="text-slate-500">
                    {formatInt(w.visits)} визитов · CR {formatPercent(w.conversionRate)}
                  </span>
                  <Link
                    to={buildHypothesisUrl({
                      segment: w.channel,
                      trouble: 'низкая конверсия',
                      evidence: `CR ${formatPercent(w.conversionRate)} при ${formatInt(w.visits)} визитах`,
                    })}
                    className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                  >
                    → гипотеза
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

/**
 * Dismissible first-visit onboarding card (3 quick steps). Thin UI over lib/onboarding +
 * localStorage; hidden once dismissed.
 */
function OnboardingCard(): JSX.Element | null {
  const [visible, setVisible] = useState(() => shouldShowOnboarding(localStorage));
  if (!visible) return null;
  const dismiss = (): void => {
    markOnboarded(localStorage);
    setVisible(false);
  };
  return (
    <div className="relative rounded-lg border border-indigo-200 bg-indigo-50 p-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Закрыть подсказку"
        className="absolute right-3 top-3 text-indigo-400 hover:text-indigo-700"
      >
        ✕
      </button>
      <h2 className="mb-2 text-base font-semibold text-indigo-900">С чего начать</h2>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-indigo-800">
        <li>Выберите период вверху страницы.</li>
        <li>Посмотрите «Слабые места» — каналы с трафиком, но низкой конверсией.</li>
        <li>Соберите отчёт со страницы «Отчёт» и зафиксируйте гипотезы.</li>
      </ol>
    </div>
  );
}

/** Data wrapper: binds the channel query to the presentational view. */
export function Overview(): JSX.Element {
  const { from, to, segment } = useFilters();
  const q = useQuery({
    queryKey: ['channels', from, to],
    queryFn: () => api.channels({ from, to }),
  });
  // The auto-detected KPI goal — independent of the date range. Absent (404) → badge hidden.
  const goal = useQuery({ queryKey: ['primary-goal'], queryFn: api.primaryGoal, retry: false });
  const geoDevice = useQuery({
    queryKey: ['geo-device', from, to],
    queryFn: () => api.geoDevice({ from, to }),
  });
  const utm = useQuery({
    queryKey: ['utm', from, to],
    queryFn: () => api.utm({ from, to }),
  });
  const entryPages = useQuery({
    queryKey: ['pages', from, to],
    queryFn: () => api.pages({ from, to }),
  });
  const exitPages = useQuery({
    queryKey: ['exit-pages', from, to],
    queryFn: () => api.exitPages({ from, to }),
  });
  const b2bDeals = useQuery({
    queryKey: ['b2b'],
    queryFn: () => api.b2b(),
  });

  // Apply segment filter
  const allChannels = q.data ?? [];
  const filteredChannels = filterBySegment(allChannels, segment);
  const filteredUtm = filterUtmBySegment(utm.data ?? [], segment, allChannels);

  return (
    <div className="space-y-6">
      <OnboardingCard />
      <OverviewView
        status={q.status}
        stats={filteredChannels}
        b2bDeals={b2bDeals.data}
        primaryGoalName={goal.data?.name}
        goalLabel={formatGoalLabel(goal.data)}
        geoDevice={geoDevice.data}
        utm={filteredUtm}
        entryPages={entryPages.data}
        exitPages={exitPages.data}
      />
    </div>
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

/** WoW delta chip: green when up, red when down, grey when flat/unknown. */
function Delta({ ratio }: { ratio: number }): JSX.Element {
  const tone = ratio > 0 ? 'text-green-700' : ratio < 0 ? 'text-red-700' : 'text-slate-400';
  const arrow = ratio > 0 ? '▲' : ratio < 0 ? '▼' : '→';
  return (
    <span className={`text-xs font-medium ${tone}`}>
      {arrow} {formatPercent(Math.abs(ratio))} WoW
    </span>
  );
}

/** Weekly digest: a one-glance "what happened this week" card (WoW visits/applications + leaders). */
function WeeklyDigest({ stats }: { stats: ChannelStat[] }): JSX.Element | null {
  const d = weeklyDigest(stats);
  if (!d.hasData) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">Дайджест за неделю</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-slate-500">Визиты (7 дней)</p>
          <p className="text-xl font-semibold">{formatInt(d.visits)}</p>
          <Delta ratio={d.visitsDelta} />
        </div>
        <div>
          <p className="text-xs text-slate-500">Заявки (7 дней)</p>
          <p className="text-xl font-semibold">{formatInt(d.applications)}</p>
          <Delta ratio={d.applicationsDelta} />
        </div>
        <div>
          <p className="text-xs text-slate-500">Топ-канал по визитам</p>
          <p className="text-base font-semibold">{d.topChannel ? d.topChannel.channel : '—'}</p>
          {d.topChannel ? (
            <p className="text-xs text-slate-500">{formatInt(d.topChannel.visits)} визитов</p>
          ) : null}
        </div>
        <div>
          <p className="text-xs text-slate-500">
            <Tooltip text="Канал с заметным трафиком, но конверсией ниже средней — наибольший потенциал роста оплат.">
              Главное слабое место
            </Tooltip>
          </p>
          {d.topWeakSpot ? (
            <>
              <p className="text-base font-semibold text-red-700">{d.topWeakSpot.channel}</p>
              <p className="text-xs text-slate-500">
                CR {formatPercent(d.topWeakSpot.conversionRate)} при{' '}
                {formatInt(d.topWeakSpot.visits)} визитах
              </p>
            </>
          ) : (
            <p className="text-base font-semibold text-green-700">нет явных утечек</p>
          )}
        </div>
      </div>
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
