import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Goal } from '@pca/shared';
import { api } from '../lib/api';
import { errorMessage } from '../lib/error-message';

interface SettingsForm {
  YANDEX_OAUTH_TOKEN: string;
  YANDEX_CLIENT_ID: string;
  YANDEX_CLIENT_SECRET: string;
  COUNTER_ID: string;
  GOAL_ID: string;
  ANTHROPIC_API_KEY: string;
}

function emptyForm(): SettingsForm {
  return {
    YANDEX_OAUTH_TOKEN: '',
    YANDEX_CLIENT_ID: '',
    YANDEX_CLIENT_SECRET: '',
    COUNTER_ID: '',
    GOAL_ID: '',
    ANTHROPIC_API_KEY: '',
  };
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/** Progress bar with detailed step descriptions for Metrika sync */
function SyncProgress({ progress, stage }: { progress: number; stage: string }): JSX.Element {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-indigo-700">{stage}</span>
        <span className="font-mono text-indigo-600">{progress}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-indigo-100">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="rounded bg-indigo-50 px-3 py-2 text-xs text-indigo-600">
        {SYNC_STAGES.find((s) => s.label === stage)?.description ?? ''}
      </div>
    </div>
  );
}

const SYNC_STAGES = [
  {
    label: 'Подключение к Яндекс.Метрике',
    description: 'Проверяем OAuth-токен и устанавливаем соединение с API Метрики...',
    pct: 5,
  },
  {
    label: 'Получение списка целей',
    description: 'Загружаем все настроенные цели счётчика для определения KPI...',
    pct: 15,
  },
  {
    label: 'Загрузка данных по каналам',
    description:
      'Парсим визиты, заявки и конверсии по каждому каналу трафика (Direct, Search, Social и др.)...',
    pct: 30,
  },
  {
    label: 'Загрузка UTM-разбивки',
    description: 'Собираем детальную статистику по UTM-меткам: source, medium, campaign...',
    pct: 45,
  },
  {
    label: 'Загрузка гео и устройств',
    description:
      'Загружаем разбивку по странам, регионам и типам устройств (смартфоны, ПК, планшеты)...',
    pct: 55,
  },
  {
    label: 'Загрузка страниц входа',
    description: 'Парсим статистику по посадочным страницам: визиты, отказы, конверсии...',
    pct: 65,
  },
  {
    label: 'Загрузка страниц выхода',
    description: 'Загружаем данные по страницам выхода для анализа точек отвала...',
    pct: 75,
  },
  {
    label: 'Сохранение в базу данных',
    description: 'Записываем все полученные данные в SQLite для быстрого доступа...',
    pct: 85,
  },
  {
    label: 'Обновление отчётов',
    description: 'Перегенерация снапшотов и переиндексация данных...',
    pct: 95,
  },
  {
    label: 'Готово!',
    description: 'Все данные обновлены. Страницы дашборда будут автоматически refreshed.',
    pct: 100,
  },
];

/** Pure presentational Settings view. */
export function SettingsView({
  status,
  settings,
  healthCounterId,
  goals,
  archivedGoals,
  onSave,
  onClear,
  onRefresh,
  onSaveError,
  onClearError,
  onRefreshError,
  isRefreshing,
  refreshResult,
}: {
  status: 'pending' | 'error' | 'success';
  settings: SettingsForm | undefined;
  healthCounterId: number | undefined;
  goals: Goal[] | undefined;
  archivedGoals: Goal[] | undefined;
  onSave: (form: SettingsForm) => void;
  onClear: () => void;
  onRefresh: () => void;
  onSaveError: string | undefined;
  onClearError: string | undefined;
  onRefreshError: string | undefined;
  isRefreshing: boolean;
  refreshResult: { goals: number; days: number; channelRows: number } | undefined;
}): JSX.Element {
  const [form, setForm] = useState<SettingsForm>(settings ?? emptyForm());
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStage, setSyncStage] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync form state when settings data arrives from server
  // If COUNTER_ID is 0 or missing, use health counter ID
  useEffect(() => {
    if (settings) {
      const counterId =
        settings.COUNTER_ID && settings.COUNTER_ID !== '0'
          ? settings.COUNTER_ID
          : healthCounterId
            ? String(healthCounterId)
            : settings.COUNTER_ID;
      setForm({ ...settings, COUNTER_ID: counterId });
    }
  }, [settings, healthCounterId]);

  // Progress simulation during sync
  useEffect(() => {
    if (!isRefreshing) {
      setSyncProgress(0);
      setSyncStage('');
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    setSyncStage(SYNC_STAGES[0]?.label ?? '');
    setSyncProgress(0);

    let stageIdx = 0;
    const stepDuration = 2000; // 2s per stage = ~20s total for 10 stages

    intervalRef.current = setInterval(() => {
      stageIdx++;
      if (stageIdx >= SYNC_STAGES.length) {
        setSyncProgress(100);
        setSyncStage(SYNC_STAGES[SYNC_STAGES.length - 1]?.label ?? '');
      } else {
        const stage = SYNC_STAGES[stageIdx];
        if (stage) {
          setSyncProgress(stage.pct);
          setSyncStage(stage.label);
        }
      }
    }, stepDuration);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRefreshing]);

  if (status === 'pending') return <p className="text-slate-500">Загрузка…</p>;
  if (status === 'error')
    return (
      <p role="alert" className="text-red-600">
        Не удалось загрузить настройки.
      </p>
    );

  const set = (field: keyof SettingsForm, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  // Display counter ID: prefer settings value, fallback to health endpoint
  const displayCounterId =
    form.COUNTER_ID && form.COUNTER_ID !== '0'
      ? form.COUNTER_ID
      : healthCounterId
        ? String(healthCounterId)
        : form.COUNTER_ID;

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold">Настройки</h2>

      {/* Current counter ID display */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-700">Текущий счётчик</h3>
        <p className="mt-1 text-lg font-mono text-indigo-600">
          {displayCounterId || 'Не установлен'}
        </p>
        <p className="text-xs text-slate-500">
          ID счётчика Яндекс.Метрики, из которого загружаются данные.
          {healthCounterId && ` (из сервера: ${healthCounterId})`}
        </p>
      </div>

      {onSaveError ? (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {onSaveError}
        </p>
      ) : null}
      {onClearError ? (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {onClearError}
        </p>
      ) : null}
      {onRefreshError ? (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {onRefreshError}
        </p>
      ) : null}

      {/* Big refresh button with progress bar */}
      <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-4">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-lg font-semibold text-white disabled:opacity-50 hover:bg-indigo-700"
        >
          {isRefreshing ? '⏳ Обновление из Метрики…' : '🔄 Обновить данные из Метрики'}
        </button>

        {isRefreshing && (
          <div className="mt-4">
            <SyncProgress progress={syncProgress} stage={syncStage} />
          </div>
        )}

        {refreshResult && !isRefreshing ? (
          <div className="mt-3 space-y-1">
            <p className="text-sm text-green-700">
              ✅ Обновлено за {refreshResult.days} дн.: {refreshResult.goals} целей,{' '}
              {refreshResult.channelRows} строк каналов.
            </p>
            <ul className="text-xs text-indigo-600">
              <li>• Каналы трафика: загружены</li>
              <li>• UTM-метки: загружены</li>
              <li>• Гео и устройства: загружены</li>
              <li>• Страницы входа/выхода: загружены</li>
              <li>• База данных: обновлена</li>
            </ul>
          </div>
        ) : null}
        <p className="mt-2 text-xs text-indigo-400">
          Последние 14 дней → SQLite → перегенерация отчётов
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <Field
          label="OAuth-токен Яндекс.Метрики"
          value={form.YANDEX_OAUTH_TOKEN}
          onChange={(v) => set('YANDEX_OAUTH_TOKEN', v)}
          placeholder="y0_..."
          type="password"
          hint="Токен с правом metrika:read"
        />
        <Field
          label="Client ID"
          value={form.YANDEX_CLIENT_ID}
          onChange={(v) => set('YANDEX_CLIENT_ID', v)}
          placeholder="ID OAuth-приложения"
        />
        <Field
          label="Client Secret"
          value={form.YANDEX_CLIENT_SECRET}
          onChange={(v) => set('YANDEX_CLIENT_SECRET', v)}
          placeholder="Секрет OAuth-приложения"
          type="password"
        />
        <Field
          label="Счётчик Метрики (COUNTER_ID)"
          value={form.COUNTER_ID}
          onChange={(v) => set('COUNTER_ID', v)}
          placeholder="12345678"
          type="number"
          hint={`0 = демо-режим (seed-данные). Текущий: ${displayCounterId || 'не установлен'}`}
        />
        <div>
          <label className="block text-sm font-medium text-slate-700">Цель KPI (GOAL_ID)</label>
          <select
            value={form.GOAL_ID}
            onChange={(e) => set('GOAL_ID', e.target.value)}
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="0">0 — Авто-определение</option>
            {goals
              ?.filter((g) => !g.isArchived)
              .map((g) => (
                <option key={g.id} value={String(g.id)}>
                  {g.id} — {g.name} {g.isB2b ? '(B2B)' : ''}
                </option>
              ))}
            {archivedGoals?.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.id} — {g.name} (архив)
              </option>
            ))}
          </select>
          <p className="mt-0.5 text-xs text-slate-400">
            0 = определить автоматически, выберите ID — зафиксировать цель. Всего:{' '}
            {goals?.length ?? 0} активных, {archivedGoals?.length ?? 0} архивных.
          </p>
        </div>
        <Field
          label="Anthropic API Key"
          value={form.ANTHROPIC_API_KEY}
          onChange={(v) => set('ANTHROPIC_API_KEY', v)}
          placeholder="sk-ant-..."
          type="password"
          hint="Для AI-анализа и генерации гипотез (можно пропустить)"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onSave(form)}
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white"
        >
          Сохранить
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Очистить данные
        </button>
      </div>

      <p className="text-xs text-slate-500">
        После сохранения перезапустите сервер ({'`'}./run.sh{'`'}), чтобы настройки применились.
      </p>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
}): JSX.Element {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
      {hint ? <p className="mt-0.5 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

/** Data wrapper. */
export function Settings(): JSX.Element {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['settings'], queryFn: api.getSettings });
  const healthQ = useQuery({ queryKey: ['health'], queryFn: api.health });
  const goalsQ = useQuery({ queryKey: ['goals'], queryFn: () => api.goals(false) });
  const archivedGoalsQ = useQuery({
    queryKey: ['goals-archived'],
    queryFn: () => api.goals(true),
  });
  const saveMut = useMutation({
    mutationFn: api.saveSettings,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['settings'] }),
  });
  const clearMut = useMutation({
    mutationFn: async () => {
      await api.saveSettings({
        YANDEX_OAUTH_TOKEN: '',
        YANDEX_CLIENT_ID: '',
        YANDEX_CLIENT_SECRET: '',
        COUNTER_ID: 0,
        GOAL_ID: 0,
        ANTHROPIC_API_KEY: '',
      });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['settings'] }),
  });
  const refreshMut = useMutation({
    mutationFn: async () => {
      const from = isoDaysAgo(13);
      const to = isoDaysAgo(0);
      return api.sync({ from, to });
    },
    onSuccess: () => {
      // Invalidate all metric queries so pages re-fetch
      void qc.invalidateQueries({ queryKey: ['channels'] });
      void qc.invalidateQueries({ queryKey: ['utm'] });
      void qc.invalidateQueries({ queryKey: ['geo-device'] });
      void qc.invalidateQueries({ queryKey: ['pages'] });
      void qc.invalidateQueries({ queryKey: ['exit-pages'] });
      void qc.invalidateQueries({ queryKey: ['primary-goal'] });
    },
  });

  const initialCounterId = useRef<string | null>(null);

  const settings: SettingsForm | undefined = q.data
    ? {
        // Don't use masked values from API — keep secrets empty so they aren't overwritten
        YANDEX_OAUTH_TOKEN: q.data.YANDEX_OAUTH_TOKEN.includes('****')
          ? ''
          : q.data.YANDEX_OAUTH_TOKEN,
        YANDEX_CLIENT_ID: q.data.YANDEX_CLIENT_ID,
        YANDEX_CLIENT_SECRET: q.data.YANDEX_CLIENT_SECRET.includes('****')
          ? ''
          : q.data.YANDEX_CLIENT_SECRET,
        COUNTER_ID: String(q.data.COUNTER_ID),
        GOAL_ID: String(q.data.GOAL_ID),
        ANTHROPIC_API_KEY: q.data.ANTHROPIC_API_KEY.includes('****')
          ? ''
          : q.data.ANTHROPIC_API_KEY,
      }
    : undefined;

  // Track initial COUNTER_ID to avoid overwriting .env on every save
  useEffect(() => {
    if (settings && initialCounterId.current === null) {
      initialCounterId.current = settings.COUNTER_ID;
    }
  }, [settings]);

  return (
    <SettingsView
      status={q.status}
      settings={settings}
      healthCounterId={healthQ.data?.counterId}
      goals={goalsQ.data}
      archivedGoals={archivedGoalsQ.data}
      onSave={(form) => {
        // Don't send masked or empty secret values back to the server
        const isMasked = (v: string) => v.includes('****');
        // Only send COUNTER_ID if it has been changed from the initial value
        const counterIdChanged = form.COUNTER_ID !== initialCounterId.current;
        saveMut.mutate({
          YANDEX_OAUTH_TOKEN:
            form.YANDEX_OAUTH_TOKEN && !isMasked(form.YANDEX_OAUTH_TOKEN)
              ? form.YANDEX_OAUTH_TOKEN
              : undefined,
          YANDEX_CLIENT_ID: form.YANDEX_CLIENT_ID || undefined,
          YANDEX_CLIENT_SECRET:
            form.YANDEX_CLIENT_SECRET && !isMasked(form.YANDEX_CLIENT_SECRET)
              ? form.YANDEX_CLIENT_SECRET
              : undefined,
          COUNTER_ID: counterIdChanged && form.COUNTER_ID ? Number(form.COUNTER_ID) : undefined,
          GOAL_ID: form.GOAL_ID ? Number(form.GOAL_ID) : undefined,
          ANTHROPIC_API_KEY:
            form.ANTHROPIC_API_KEY && !isMasked(form.ANTHROPIC_API_KEY)
              ? form.ANTHROPIC_API_KEY
              : undefined,
        });
      }}
      onClear={() => clearMut.mutate()}
      onRefresh={() => refreshMut.mutate()}
      onSaveError={errorMessage(saveMut.error)}
      onClearError={errorMessage(clearMut.error)}
      onRefreshError={errorMessage(refreshMut.error)}
      isRefreshing={refreshMut.isPending}
      refreshResult={refreshMut.data}
    />
  );
}
