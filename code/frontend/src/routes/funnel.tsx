import { useQuery } from '@tanstack/react-query';
import type { ChannelStat, B2bDeal, GeoDeviceStat, PageStat } from '@pca/shared';
import { periodTotals } from '@pca/shared';
import { api } from '../lib/api';
import { useFilters } from '../store/filters';
import { formatInt, formatPercent } from '../lib/format';
import { combineStatus, type QueryStatus } from '../lib/query-status';
import { EChart } from '../components/charts/EChart';
import { ChartCaption } from '../components/charts/ChartCaption';
import { EmptyState } from '../components/EmptyState';
import { channelRows } from '../lib/traffic';
import { funnelByChannelOption } from '../lib/funnel-by-channel';
import { byCountry, audienceBarOption } from '../lib/audience';

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
  const icon = type === 'good' ? '✅' : type === 'warning' ? '🔴' : 'ℹ️';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${colors}`}>
      <span className="mr-1">{icon}</span> {text}
    </span>
  );
}

/** Bar chart for channel conversion rates */
function channelCrOption(channels: ChannelStat[]): object {
  const rows = channelRows(channels)
    .filter((r) => r.visits > 20)
    .sort((a, b) => a.conversionRate - b.conversionRate);
  return {
    title: {
      text: 'Конверсия каналов (CR заявки/визиты)',
      left: 'center',
      textStyle: { fontSize: 13 },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown[]) => {
        const p = params[0] as { name: string; value: number };
        return `${p.name}<br/>CR: ${formatPercent(p.value)}`;
      },
    },
    grid: { left: 120, right: 16, top: 32, bottom: 28 },
    xAxis: { type: 'value', axisLabel: { formatter: (v: number) => `${(v * 100).toFixed(0)}%` } },
    yAxis: { type: 'category', data: rows.map((r) => r.channel) },
    series: [
      {
        name: 'CR',
        type: 'bar',
        data: rows.map((r) => ({
          value: r.conversionRate,
          itemStyle: {
            color:
              r.conversionRate > 0.02 ? '#22c55e' : r.conversionRate > 0.01 ? '#f59e0b' : '#ef4444',
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

/** ECharts funnel option */
function funnelChartOption(
  visits: number,
  reaches: number,
  b2bTickets: number,
  b2bPaid: number,
): object {
  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: { name: string; value: number }) => `${p.name}: ${formatInt(p.value)}`,
    },
    series: [
      {
        name: 'Воронка',
        type: 'funnel',
        width: '80%',
        left: '10%',
        top: 20,
        bottom: 20,
        min: 0,
        max: visits,
        minSize: '0%',
        maxSize: '100%',
        sort: 'descending',
        gap: 4,
        label: {
          show: true,
          position: 'inside',
          formatter: (p: { name: string; value: number }) => `${p.name}\n${formatInt(p.value)}`,
          fontSize: 11,
        },
        data: [
          { name: 'Визиты', value: visits, itemStyle: { color: '#6366f1' } },
          { name: 'Заявки B2C', value: reaches, itemStyle: { color: '#8b5cf6' } },
          { name: 'B2B pipeline', value: b2bTickets, itemStyle: { color: '#f59e0b' } },
          { name: 'Оплачено B2B', value: b2bPaid, itemStyle: { color: '#22c55e' } },
        ],
      },
    ],
  };
}

/** Funnel loss analysis */
function FunnelLossAnalysis({
  visits,
  reaches,
  b2bTickets,
  b2bPaid,
}: {
  visits: number;
  reaches: number;
  b2bTickets: number;
  b2bPaid: number;
}): JSX.Element {
  const lostAtApplication = visits - reaches;
  const lostAtPipeline = reaches - b2bTickets;
  const lostAtPayment = b2bTickets - b2bPaid;
  const applicationLossRate = visits > 0 ? (lostAtApplication / visits) * 100 : 0;
  const pipelineLossRate = reaches > 0 ? (lostAtPipeline / reaches) * 100 : 0;
  const paymentLossRate = b2bTickets > 0 ? (lostAtPayment / b2bTickets) * 100 : 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">Анализ потерь в воронке</h3>
      <div className="space-y-2 text-sm text-slate-600">
        <div className="flex items-center justify-between">
          <span>Потеряно на этапе заявки:</span>
          <span className="font-medium">
            {formatInt(lostAtApplication)} визитов ({formatPercent(applicationLossRate / 100)})
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Потеряно на этапе B2B pipeline:</span>
          <span className="font-medium">
            {formatInt(Math.max(0, lostAtPipeline))} (
            {formatPercent(Math.max(0, pipelineLossRate) / 100)})
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Потеряно на этапе оплаты:</span>
          <span className="font-medium">
            {formatInt(Math.max(0, lostAtPayment))} (
            {formatPercent(Math.max(0, paymentLossRate) / 100)})
          </span>
        </div>
      </div>
    </div>
  );
}

/** Pure presentational Funnel — the «заявка ≠ оплата» conversion path across all states. */
export function FunnelView({
  status,
  stats,
  deals,
  geoDevice,
  pages,
}: {
  status: QueryStatus;
  stats: ChannelStat[];
  deals: B2bDeal[];
  geoDevice: GeoDeviceStat[];
  pages: PageStat[];
}): JSX.Element {
  if (status === 'pending') return <p className="text-slate-500">Загрузка…</p>;
  if (status === 'error')
    return (
      <p role="alert" className="text-red-700">
        Не удалось загрузить данные. Запустите sync и проверьте backend.
      </p>
    );

  // Headline Визиты/Заявки B2C come from the single factsource so this page agrees with Overview
  // and Goals. appConversionRate below reuses the same clamped CR.
  const { visits, applications: reaches, conversionRate: appConversionRate } = periodTotals(stats);
  const b2bTickets = deals.reduce((a, d) => a + d.tickets, 0);
  const b2bPaid = deals.reduce((a, d) => a + (d.stage === 'paid' ? d.tickets : 0), 0);
  const b2bDealsCount = deals.length;

  if (visits === 0 && b2bDealsCount === 0) return <EmptyState />;

  // Conversion rate between B2B stages
  const paymentConversionRate = b2bTickets > 0 ? b2bPaid / b2bTickets : 0;

  // Geo data
  const geoRows = geoDevice.length > 0 ? byCountry(geoDevice) : [];

  // B2B deals by stage
  const dealsByStage = deals.reduce<Map<string, { tickets: number; count: number }>>((acc, d) => {
    const cur = acc.get(d.stage) ?? { tickets: 0, count: 0 };
    acc.set(d.stage, { tickets: cur.tickets + d.tickets, count: cur.count + 1 });
    return acc;
  }, new Map());

  // Page insights
  const highBouncePages = pages.filter((p) => p.bounceRate > 0.4 && p.visits > 30);
  const lowCrPages = pages.filter((p) => p.conversionRate < 0.005 && p.visits > 50);

  return (
    <section className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-slate-500">Визитов</div>
          <div className="text-xl font-bold">{formatInt(visits)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-slate-500">Заявок B2C</div>
          <div className="text-xl font-bold">{formatInt(reaches)}</div>
          <div className="text-xs text-slate-500">CR {formatPercent(appConversionRate)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-slate-500">B2B pipeline</div>
          <div className="text-xl font-bold">{formatInt(b2bTickets)}</div>
          <div className="text-xs text-slate-500">{b2bDealsCount} сделок</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="text-xs text-slate-500">Оплачено B2B</div>
          <div className="text-xl font-bold">{formatInt(b2bPaid)}</div>
          <div className="text-xs text-slate-500">CR {formatPercent(paymentConversionRate)}</div>
        </div>
      </div>

      {/* Key insights */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Ключевые наблюдения</h3>
        <div className="flex flex-wrap gap-2">
          {appConversionRate > 0.02 ? (
            <InsightBadge
              type="good"
              text={`CR заявка/визит ${formatPercent(appConversionRate)} — хороший`}
            />
          ) : (
            <InsightBadge
              type="warning"
              text={`CR заявка/визит ${formatPercent(appConversionRate)} — низкий, цель > 2%`}
            />
          )}
          {b2bPaid > 0 ? (
            <InsightBadge
              type="good"
              text={`B2B приносит ${formatInt(b2bPaid)} оплаченных билетов`}
            />
          ) : (
            <InsightBadge type="warning" text="B2B = 0 оплат — нужно запустить активные продажи" />
          )}
          {b2bDealsCount > 0 ? (
            <InsightBadge type="info" text={`${b2bDealsCount} B2B сделок в работе`} />
          ) : (
            <InsightBadge type="warning" text="Нет B2B сделок — воронка не запущена" />
          )}
        </div>
      </div>

      {/* Funnel chart */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold">Воронка конверсии</h3>
        <EChart option={funnelChartOption(visits, reaches, b2bTickets, b2bPaid)} />
        <ChartCaption
          correct="Ступени визит→заявка строятся из channel_stats; ступени билетов/оплат — из b2b_manual."
          caveat="Если B2B-данные не введены вручную, нижние ступени воронки занижены и не отражают реальные оплаты."
          advice="Заполняйте b2b_manual после каждой сделки, чтобы воронка показывала путь до оплаты, а не только до заявки."
        />
      </div>

      {/* Loss analysis */}
      <FunnelLossAnalysis
        visits={visits}
        reaches={reaches}
        b2bTickets={b2bTickets}
        b2bPaid={b2bPaid}
      />

      {/* Channel conversion chart */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <EChart option={channelCrOption(stats)} />
        <ChartCaption
          correct="CR = заявки / визиты по каждому каналу, значение ограничено диапазоном [0; 100%]."
          caveat="При малом числе визитов CR статистически шумный — один-два события сильно меняют процент."
          advice="Принимайте решения по CR каналов с ≥30 визитами; остальные считайте ориентировочными."
        />
      </div>

      {/* Funnel by channel: visits vs applications */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold">Воронка по каналам: визиты vs заявки</h3>
        <EChart option={funnelByChannelOption(stats)} />
        <ChartCaption
          correct="Рядом стоят столбцы визитов и заявок по топ-каналам — видно, кто доводит до заявки, а кто даёт трафик «вхолостую»."
          caveat="Показаны только топ-каналы по визитам; «длинный хвост» мелких источников в график не попадает."
          advice="Канал с большим разрывом «визиты ≫ заявки» — кандидат на гипотезу о качестве трафика."
        />
      </div>

      {/* Geo breakdown */}
      {geoRows.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-lg font-semibold">Конверсия по странам</h3>
          <EChart option={audienceBarOption(geoRows, 'Заявки по странам')} />
          <ChartCaption
            correct="Заявки в разбивке по странам из geo_device_stats — отражает реальную географию аудитории."
            caveat="Метрика определяет страну по IP; VPN и мобильные операторы могут искажать гео."
            advice="Используйте для языка и таргетинга кампаний, но не как единственный признак сегмента."
          />
        </div>
      )}

      {/* B2B deals by stage */}
      {dealsByStage.size > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">B2B сделки по этапам</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { stage: 'lead', label: 'Лид', color: 'bg-slate-100' },
              { stage: 'negotiation', label: 'Переговоры', color: 'bg-amber-100' },
              { stage: 'invoiced', label: 'Счёт выставлен', color: 'bg-blue-100' },
              { stage: 'paid', label: 'Оплачено', color: 'bg-green-100' },
            ].map(({ stage, label, color }) => {
              const data = dealsByStage.get(stage);
              return (
                <div key={stage} className={`rounded-lg p-3 ${color}`}>
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="text-lg font-bold">
                    {data ? `${formatInt(data.tickets)} билетов` : '0'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {data ? `${data.count} сделок` : '0 сделок'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Page insights */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Проблемные страницы</h3>
        <div className="space-y-2 text-sm text-slate-600">
          {highBouncePages.length > 0 ? (
            <div>
              <p className="font-medium text-red-700">Высокий bounce rate (&gt; 40%):</p>
              <ul className="mt-1 list-inside list-disc">
                {highBouncePages.slice(0, 5).map((p, i) => (
                  <li key={`${p.page}-${i}`}>
                    {p.page} — {formatPercent(p.bounceRate)} при {formatInt(p.visits)} визитах
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-green-700">✅ Нет страниц с критическим bounce rate.</p>
          )}
          {lowCrPages.length > 0 && (
            <div>
              <p className="mt-2 font-medium text-amber-700">Низкий CR (&lt; 0.5%):</p>
              <ul className="mt-1 list-inside list-disc">
                {lowCrPages.slice(0, 5).map((p, i) => (
                  <li key={`${p.page}-${i}`}>
                    {p.page} — {formatPercent(p.conversionRate)} при {formatInt(p.visits)} визитах
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Рекомендации</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          {appConversionRate < 0.01 && (
            <li className="flex items-start gap-2">
              <span className="text-red-500">🔴</span>
              <span>
                <b>CR {formatPercent(appConversionRate)} — критически низкий.</b> Проверить
                посадочные страницы, упростить форму заявки, добавить социальное доказательство.
              </span>
            </li>
          )}
          {b2bPaid === 0 && (
            <li className="flex items-start gap-2">
              <span className="text-red-500">🔴</span>
              <span>
                <b>B2B = 0 оплат.</b> Запустить активные продажи: составить список целевых компаний,
                отправить персональные офферы, назначить встречи.
              </span>
            </li>
          )}
          {highBouncePages.length > 0 && (
            <li className="flex items-start gap-2">
              <span className="text-amber-500">🟡</span>
              <span>
                <b>{highBouncePages.length} страниц с bounce &gt; 40%.</b> Упростить контент,
                добавить CTA, проверить мобильную версию.
              </span>
            </li>
          )}
          {appConversionRate >= 0.02 && (
            <li className="flex items-start gap-2">
              <span className="text-green-500">🟢</span>
              <span>
                <b>CR {formatPercent(appConversionRate)} — хороший уровень.</b> Масштабировать
                трафик на каналы с лучшим CR.
              </span>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

/** Data wrapper. */
export function Funnel(): JSX.Element {
  const { from, to } = useFilters();
  const channelsQ = useQuery({
    queryKey: ['channels', from, to],
    queryFn: () => api.channels({ from, to }),
  });
  const dealsQ = useQuery({ queryKey: ['b2b'], queryFn: api.b2b });
  const geoQ = useQuery({
    queryKey: ['geo-device', from, to],
    queryFn: () => api.geoDevice({ from, to }),
  });
  const pagesQ = useQuery({
    queryKey: ['pages', from, to],
    queryFn: () => api.pages({ from, to }),
  });

  const status = combineStatus(channelsQ.status, dealsQ.status, geoQ.status, pagesQ.status);

  return (
    <FunnelView
      status={status}
      stats={channelsQ.data ?? []}
      deals={dealsQ.data ?? []}
      geoDevice={geoQ.data ?? []}
      pages={pagesQ.data ?? []}
    />
  );
}
