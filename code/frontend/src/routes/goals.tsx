import { useQuery } from '@tanstack/react-query';
import type { B2bDeal, ChannelStat } from '@pca/shared';
import { periodTotals } from '@pca/shared';
import { api } from '../lib/api';
import { useFilters } from '../store/filters';
import { formatInt, formatPercent } from '../lib/format';

type QueryStatus = 'pending' | 'error' | 'success';

/** Progress ring showing goal completion */
function GoalRing({
  progress,
  target,
  current,
}: {
  progress: number;
  target: number;
  current: number;
}): JSX.Element {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (progress / 100) * circumference;
  const color = progress >= 100 ? '#22c55e' : progress >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          className="transition-all duration-500"
        />
        <text x="50" y="42" textAnchor="middle" className="fill-slate-800 text-lg font-bold">
          {formatInt(current)}
        </text>
        <text x="50" y="58" textAnchor="middle" className="fill-slate-500 text-[3px]">
          из {formatInt(target)}
        </text>
      </svg>
      <span className="mt-2 text-sm font-medium" style={{ color }}>
        {progress.toFixed(1)}% достигнуто
      </span>
    </div>
  );
}

/** Calculate total paid B2B tickets from deals */
function calcB2bPaid(deals: B2bDeal[]): number {
  return deals.filter((d) => d.stage === 'paid').reduce((sum, d) => sum + d.tickets, 0);
}

/** Calculate total B2B pipeline tickets (not yet paid) */
function calcB2bPipeline(deals: B2bDeal[]): number {
  return deals.filter((d) => d.stage !== 'paid').reduce((sum, d) => sum + d.tickets, 0);
}

/** Pure presentational Goals view. */
export function GoalsView({
  status,
  target,
  b2cApplications,
  b2bPaid,
  b2bPipeline,
  totalVisits,
  overallCR,
  deals,
}: {
  status: QueryStatus;
  target: number;
  b2cApplications: number;
  b2bPaid: number;
  b2bPipeline: number;
  totalVisits: number;
  overallCR: number;
  deals: B2bDeal[];
}): JSX.Element {
  if (status === 'pending') return <p className="text-slate-500">Загрузка…</p>;
  if (status === 'error')
    return (
      <p role="alert" className="text-red-600">
        Не удалось загрузить данные о целях.
      </p>
    );

  // Total progress = B2B paid + estimated B2C conversions (assuming 30% of applications convert)
  const estimatedB2cPaid = Math.round(b2cApplications * 0.3);
  const current = b2bPaid + estimatedB2cPaid;
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const remaining = Math.max(0, target - current);

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold">Цели ProductCamp</h2>

      {/* Main goal ring */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4 lg:flex-row lg:justify-center">
          <GoalRing progress={progress} target={target} current={current} />
          <div className="space-y-2 text-center lg:text-left">
            <h3 className="text-lg font-semibold">
              Главная цель: {formatInt(target)} платных билетов
            </h3>
            <div className="space-y-1 text-sm text-slate-600">
              <p>
                Осталось: <span className="font-bold text-red-600">{formatInt(remaining)}</span>{' '}
                билетов
              </p>
              <div className="rounded bg-slate-50 px-3 py-2">
                <p className="font-medium">B2C заявки (Метрика): {formatInt(b2cApplications)}</p>
                <p className="text-xs text-slate-500">
                  ≈ {formatInt(estimatedB2cPaid)} платных (оценка 30% конверсии заявка→оплата)
                </p>
              </div>
              <div className="rounded bg-slate-50 px-3 py-2">
                <p className="font-medium">
                  B2B оплачено: <span className="text-green-600">{formatInt(b2bPaid)}</span>
                </p>
                <p className="text-xs text-slate-500">
                  В воронке: {formatInt(b2bPipeline)} билетов ({deals.length} сделок)
                </p>
              </div>
            </div>
            {progress >= 100 ? (
              <div className="rounded bg-green-100 px-3 py-2 text-sm text-green-800">
                ✅ Цель достигнута!
              </div>
            ) : progress >= 50 ? (
              <div className="rounded bg-amber-100 px-3 py-2 text-sm text-amber-800">
                ⚠️ Более половины пути пройдено, но нужно ускориться
              </div>
            ) : (
              <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-800">
                🔴 Нужно значительно ускорить конверсию
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Funnel metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Визитов</div>
          <div className="text-2xl font-bold">{formatInt(totalVisits)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Общий CR</div>
          <div
            className={`text-2xl font-bold ${overallCR > 0.02 ? 'text-green-600' : overallCR > 0.01 ? 'text-amber-600' : 'text-red-600'}`}
          >
            {formatPercent(overallCR)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">B2B сделок</div>
          <div className="text-2xl font-bold">{deals.length}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Прогресс</div>
          <div
            className={`text-2xl font-bold ${progress >= 50 ? 'text-amber-600' : 'text-red-600'}`}
          >
            {progress.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* B2B deals table */}
      {deals.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">B2B сделки</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-500">
                  <th className="px-3 py-2">Компания</th>
                  <th className="px-3 py-2">Билеты</th>
                  <th className="px-3 py-2">Этап</th>
                  <th className="px-3 py-2">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => {
                  const stageColor =
                    d.stage === 'paid'
                      ? 'text-green-600'
                      : d.stage === 'invoiced'
                        ? 'text-blue-600'
                        : d.stage === 'negotiation'
                          ? 'text-amber-600'
                          : 'text-slate-500';
                  const stageLabel =
                    d.stage === 'paid'
                      ? 'Оплачено'
                      : d.stage === 'invoiced'
                        ? 'Выставлен счёт'
                        : d.stage === 'negotiation'
                          ? 'Переговоры'
                          : 'Лид';
                  return (
                    <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2">{d.company}</td>
                      <td className="px-3 py-2">{formatInt(d.tickets)}</td>
                      <td className={`px-3 py-2 font-medium ${stageColor}`}>{stageLabel}</td>
                      <td className="px-3 py-2">
                        {d.amountRub ? `${formatInt(d.amountRub)} ₽` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Forecast */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold">Прогноз достижения цели</h3>
        <div className="space-y-2 text-sm text-slate-600">
          <p>
            При текущем CR {formatPercent(overallCR)} и {formatInt(totalVisits)} визитах получено{' '}
            {formatInt(b2cApplications)} заявок B2C.
          </p>
          <p>
            {b2bPaid > 0
              ? `B2B уже принесло ${formatInt(b2bPaid)} оплаченных билетов.`
              : 'B2B-направление пока не генерирует оплаты — нужно запустить активные продажи.'}
          </p>
          <p>
            Для достижения цели в {formatInt(target)} билетов необходимо ещё{' '}
            <span className="font-bold text-red-600">{formatInt(remaining)}</span> оплат.
          </p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold">Что нужно сделать</h3>
        <ul className="space-y-3 text-sm text-slate-600">
          {b2bPaid === 0 && (
            <li className="flex items-start gap-2">
              <span className="text-red-500">🔴</span>
              <span>
                <b>B2B = 0 оплат.</b> Запустить активные продажи: составить список 30 целевых
                компаний, отправить персональные офферы, назначить встречи.
              </span>
            </li>
          )}
          {overallCR < 0.01 && (
            <li className="flex items-start gap-2">
              <span className="text-red-500">🔴</span>
              <span>
                <b>CR {formatPercent(overallCR)} — критически низкий.</b> Проверить посадочные
                страницы, упростить форму заявки, добавить социальное доказательство.
              </span>
            </li>
          )}
          {overallCR >= 0.01 && overallCR < 0.02 && (
            <li className="flex items-start gap-2">
              <span className="text-amber-500">🟡</span>
              <span>
                <b>CR {formatPercent(overallCR)} — ниже целевого 2%.</b> A/B-тестировать CTA,
                заголовки, формы на ключевых страницах.
              </span>
            </li>
          )}
          {overallCR >= 0.02 && (
            <li className="flex items-start gap-2">
              <span className="text-green-500">🟢</span>
              <span>
                <b>CR {formatPercent(overallCR)} — хороший уровень.</b> Масштабировать трафик на
                каналы с лучшим CR.
              </span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <span className="text-blue-500">ℹ️</span>
            <span>
              <b>Конверсия заявка→оплата ~30%.</b> Настроить follow-up: авто-письмо в течение 1
              часа, звонок менеджера в течение 24 часов.
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}

/** Data wrapper. */
export function Goals(): JSX.Element {
  const { from, to } = useFilters();
  const channelsQ = useQuery({
    queryKey: ['channels', from, to],
    queryFn: () => api.channels({ from, to }),
  });
  const b2bQ = useQuery({
    queryKey: ['b2b'],
    queryFn: () => api.b2b(),
  });

  const status: QueryStatus =
    channelsQ.status === 'pending' || b2bQ.status === 'pending'
      ? 'pending'
      : channelsQ.status === 'error' || b2bQ.status === 'error'
        ? 'error'
        : 'success';

  const data: ChannelStat[] = channelsQ.data ?? [];
  const deals: B2bDeal[] = b2bQ.data ?? [];
  // Headline Визиты/Заявки B2C/CR come from the single factsource so this page agrees with
  // Overview and Funnel.
  const totals = periodTotals(data);
  const b2bPaid = calcB2bPaid(deals);
  const b2bPipeline = calcB2bPipeline(deals);

  return (
    <GoalsView
      status={status}
      target={300}
      b2cApplications={totals.applications}
      b2bPaid={b2bPaid}
      b2bPipeline={b2bPipeline}
      totalVisits={totals.visits}
      overallCR={totals.conversionRate}
      deals={deals}
    />
  );
}
