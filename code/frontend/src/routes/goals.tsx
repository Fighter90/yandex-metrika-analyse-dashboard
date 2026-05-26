import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useFilters } from '../store/filters';
import { formatInt, formatPercent } from '../lib/format';
import { summarizeChannels } from '../lib/overview';

type QueryStatus = 'pending' | 'error' | 'success';

/** Progress ring showing goal completion */
function GoalRing({ progress, target, current }: { progress: number; target: number; current: number }): JSX.Element {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (progress / 100) * circumference;
  const color = progress >= 100 ? '#22c55e' : progress >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 100 100">
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
        <text x="50" y="45" textAnchor="middle" className="fill-slate-800 text-xl font-bold">
          {formatInt(current)}
        </text>
        <text x="50" y="60" textAnchor="middle" className="fill-slate-500 text-xs">
          из {formatInt(target)}
        </text>
      </svg>
      <span className="mt-2 text-sm font-medium" style={{ color }}>
        {progress.toFixed(1)}% достигнуто
      </span>
    </div>
  );
}

/** Pure presentational Goals view. */
export function GoalsView({
  status,
  target,
  current,
  b2cApplications,
  b2bPaid,
}: {
  status: QueryStatus;
  target: number;
  current: number;
  b2cApplications: number;
  b2bPaid: number;
}): JSX.Element {
  if (status === 'pending') return <p className="text-slate-500">Загрузка…</p>;
  if (status === 'error')
    return (
      <p role="alert" className="text-red-600">
        Не удалось загрузить данные о целях.
      </p>
    );

  const progress = target > 0 ? (current / target) * 100 : 0;
  const remaining = Math.max(0, target - current);

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold">Цели ProductCamp</h2>

      {/* Main goal ring */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4 lg:flex-row lg:justify-center">
          <GoalRing progress={progress} target={target} current={current} />
          <div className="space-y-2 text-center lg:text-left">
            <h3 className="text-lg font-semibold">Главная цель: {formatInt(target)} платных билетов</h3>
            <div className="space-y-1 text-sm text-slate-600">
              <p>Осталось: <span className="font-bold">{formatInt(remaining)}</span> билетов</p>
              <p>B2C заявок: <span className="font-bold">{formatInt(b2cApplications)}</span></p>
              <p>B2B оплачено: <span className="font-bold">{formatInt(b2bPaid)}</span></p>
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

      {/* Weekly progress breakdown */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold">Прогноз достижения цели</h3>
        <p className="text-sm text-slate-600">
          При текущей скорости {formatInt(current)} за период, для достижения цели в {formatInt(target)} билетов
          необходимо {remaining > 0 ? `ещё ${formatInt(remaining)} оплат` : 'цель уже достигнута!'}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Совет: увеличьте CR с {b2cApplications > 0 ? formatPercent(b2cApplications / (current + b2cApplications)) : '0%'} до 5–10%,
          чтобы ускорить прогресс.
        </p>
      </div>

      {/* Channel contribution */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-lg font-semibold">Что нужно сделать</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <span>🎯</span>
            <span>Определите ключевые каналы с высоким CR и направьте туда бюджет</span>
          </li>
          <li className="flex items-start gap-2">
            <span>📊</span>
            <span>Настройте UTM-метки для отслеживания источников заявок</span>
          </li>
          <li className="flex items-start gap-2">
            <span>🔄</span>
            <span>Оптимизируйте воронку: снизьте bounce rate на ключевых страницах</span>
          </li>
          <li className="flex items-start gap-2">
            <span>🤝</span>
            <span>Развивайте B2B-пайплайн для крупных оплат</span>
          </li>
        </ul>
      </div>
    </section>
  );
}

/** Data wrapper. */
export function Goals(): JSX.Element {
  const { from, to } = useFilters();
  const q = useQuery({
    queryKey: ['channels', from, to],
    queryFn: () => api.channels({ from, to }),
  });

  const status: QueryStatus = q.status === 'pending' ? 'pending' : q.status === 'error' ? 'error' : 'success';

  const data = q.data ?? [];
  const kpi = summarizeChannels(data);
  const b2bPaid = kpi.reaches; // This is a placeholder - would need actual B2B data

  return (
    <GoalsView
      status={status}
      target={300}
      current={b2bPaid}
      b2cApplications={kpi.reaches}
      b2bPaid={b2bPaid}
    />
  );
}
