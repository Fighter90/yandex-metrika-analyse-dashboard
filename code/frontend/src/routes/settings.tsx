import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

/** Pure presentational Settings view. */
export function SettingsView({
  status,
  settings,
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

  // Sync form state when settings data arrives from server
  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (status === 'pending') return <p className="text-slate-500">Загрузка…</p>;
  if (status === 'error')
    return (
      <p role="alert" className="text-red-600">
        Не удалось загрузить настройки.
      </p>
    );

  const set = (field: keyof SettingsForm, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold">Настройки</h2>

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

      {/* Big refresh button */}
      <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-4">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-lg font-semibold text-white disabled:opacity-50 hover:bg-indigo-700"
        >
          {isRefreshing ? '⏳ Обновляю данные из Метрики…' : '🔄 Обновить данные из Метрики'}
        </button>
        {refreshResult ? (
          <p className="mt-2 text-sm text-indigo-700">
            ✅ За {refreshResult.days} дн.: {refreshResult.goals} целей,{' '}
            {refreshResult.channelRows} строк каналов.
          </p>
        ) : null}
        <p className="mt-1 text-xs text-indigo-400">
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
          hint="0 = демо-режим (seed-данные)"
        />
        <Field
          label="Цель KPI (GOAL_ID)"
          value={form.GOAL_ID}
          onChange={(v) => set('GOAL_ID', v)}
          placeholder="0 = авто-определение"
          type="number"
          hint="0 = определить автоматически, >0 — зафиксировать цель"
        />
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

  const settings: SettingsForm | undefined = q.data
    ? {
        YANDEX_OAUTH_TOKEN: q.data.YANDEX_OAUTH_TOKEN,
        YANDEX_CLIENT_ID: q.data.YANDEX_CLIENT_ID,
        YANDEX_CLIENT_SECRET: q.data.YANDEX_CLIENT_SECRET,
        COUNTER_ID: String(q.data.COUNTER_ID),
        GOAL_ID: String(q.data.GOAL_ID),
        ANTHROPIC_API_KEY: q.data.ANTHROPIC_API_KEY,
      }
    : undefined;

  return (
    <SettingsView
      status={q.status}
      settings={settings}
      onSave={(form) =>
        saveMut.mutate({
          YANDEX_OAUTH_TOKEN: form.YANDEX_OAUTH_TOKEN || undefined,
          YANDEX_CLIENT_ID: form.YANDEX_CLIENT_ID || undefined,
          YANDEX_CLIENT_SECRET: form.YANDEX_CLIENT_SECRET || undefined,
          COUNTER_ID: form.COUNTER_ID ? Number(form.COUNTER_ID) : undefined,
          GOAL_ID: form.GOAL_ID ? Number(form.GOAL_ID) : undefined,
          ANTHROPIC_API_KEY: form.ANTHROPIC_API_KEY || undefined,
        })
      }
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
