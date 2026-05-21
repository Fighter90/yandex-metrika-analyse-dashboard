import { useEffect, useState } from 'react';
import { KPI_TARGET_PAID_TICKETS } from '@pca/shared';

type HealthState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ok'; status: string; counterId: number; tokenPresent: boolean };

export function App(): JSX.Element {
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' });

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d: { status: string; counterId: number; metrikaTokenPresent: boolean }) =>
        setHealth({
          kind: 'ok',
          status: d.status,
          counterId: d.counterId,
          tokenPresent: d.metrikaTokenPresent,
        }),
      )
      .catch((e: unknown) =>
        setHealth({ kind: 'error', message: e instanceof Error ? e.message : 'backend unreachable' }),
      );
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">
          ProductCamp · Конверсии и лидген
        </p>
        <h1 className="mt-2 text-3xl font-bold">Conversion Analytics Dashboard</h1>
        <p className="mt-3 text-slate-600">
          Цель кампании: <span className="font-semibold">{KPI_TARGET_PAID_TICKETS}+ платных билетов</span>.
          Заявка ≠ оплата — инструмент разделяет их явно.
        </p>

        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Backend health</h2>
          {health.kind === 'loading' && <p className="mt-2 text-slate-500">Проверяю /api/health…</p>}
          {health.kind === 'error' && (
            <p className="mt-2 text-red-600">Backend недоступен: {health.message}</p>
          )}
          {health.kind === 'ok' && (
            <ul className="mt-2 space-y-1 text-sm">
              <li>Статус: <span className="font-mono text-green-700">{health.status}</span></li>
              <li>Counter ID: <span className="font-mono">{health.counterId}</span></li>
              <li>
                OAuth-токен:{' '}
                <span className={health.tokenPresent ? 'text-green-700' : 'text-amber-600'}>
                  {health.tokenPresent ? 'настроен' : 'не задан (заполни .env)'}
                </span>
              </li>
            </ul>
          )}
        </section>

        <p className="mt-8 text-xs text-slate-400">
          Итерация 0 — скелет. Дашборд, гипотезы (Double Diamond + методология Воронковой) и отчёты
          появятся в следующих итерациях.
        </p>
      </div>
    </main>
  );
}
