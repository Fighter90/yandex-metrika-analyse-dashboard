import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { RawResponse } from '@pca/shared';
import { api } from '../lib/api';

export type SourcesStatus = 'idle' | 'pending' | 'error' | 'success';

/**
 * Pure presentational Sources view: «Откуда эта цифра?» — look up a cached Metrika response by its
 * `raw_response_id` and show the exact request + payload behind a number (anti-hallucination).
 */
export function SourcesView({
  status,
  raw,
  idValue,
  onIdChange,
  onLookup,
}: {
  status: SourcesStatus;
  raw: RawResponse | undefined;
  idValue: string;
  onIdChange: (v: string) => void;
  onLookup: () => void;
}): JSX.Element {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Откуда эта цифра?</h2>
        <p className="text-sm text-slate-500">
          Введите <code>raw_response_id</code> — покажем запрос к Метрике и сохранённый ответ из
          SQLite. Каждое число прослеживается до сырого ответа.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          aria-label="raw_response_id"
          value={idValue}
          onChange={(e) => onIdChange(e.target.value)}
          placeholder="напр. 1"
          className="w-32 rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={onLookup}
          className="rounded bg-indigo-600 px-3 py-1 text-sm text-white"
        >
          Показать
        </button>
      </div>

      {status === 'pending' ? <p className="text-slate-500">Загрузка…</p> : null}
      {status === 'error' ? (
        <p role="alert" className="text-red-600">
          Ответ не найден. Проверьте id.
        </p>
      ) : null}
      {status === 'success' && raw ? (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <dl className="grid grid-cols-2 gap-1 text-sm">
            <dt className="text-slate-500">endpoint</dt>
            <dd>{raw.endpoint}</dd>
            <dt className="text-slate-500">query_hash</dt>
            <dd className="break-all">{raw.queryHash}</dd>
            <dt className="text-slate-500">период</dt>
            <dd>
              {raw.dateFrom} — {raw.dateTo}
            </dd>
            <dt className="text-slate-500">fetched_at</dt>
            <dd>{raw.fetchedAt}</dd>
          </dl>
          <pre className="max-h-96 overflow-auto rounded bg-slate-50 p-3 text-xs">
            {JSON.stringify(raw.payload, null, 2)}
          </pre>
        </div>
      ) : null}
    </section>
  );
}

/** Data wrapper: commits a numeric id and fetches the raw response on demand. */
export function Sources(): JSX.Element {
  const [idValue, setIdValue] = useState('');
  const [committed, setCommitted] = useState<number | undefined>(undefined);
  const q = useQuery({
    queryKey: ['raw', committed],
    queryFn: () => api.rawResponse(committed as number),
    enabled: committed !== undefined,
  });
  const status: SourcesStatus = committed === undefined ? 'idle' : q.status;
  return (
    <SourcesView
      status={status}
      raw={q.data}
      idValue={idValue}
      onIdChange={setIdValue}
      onLookup={() => setCommitted(Number(idValue))}
    />
  );
}
