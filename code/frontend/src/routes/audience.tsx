import { useQuery } from '@tanstack/react-query';
import type { GeoDeviceStat } from '@pca/shared';
import { api } from '../lib/api';
import { useFilters } from '../store/filters';
import { formatInt, formatPercent } from '../lib/format';
import {
  byCountry,
  byDevice,
  audienceBarOption,
  deviceShareOption,
  type AudienceRow,
} from '../lib/audience';
import { EChart } from '../components/charts/EChart';
import type { QueryStatus } from '../lib/query-status';

function AudienceTable({ title, rows }: { title: string; rows: AudienceRow[] }): JSX.Element {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-1">{title}</th>
            <th>Визиты</th>
            <th>Пользователи</th>
            <th>Заявки</th>
            <th>CR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-slate-100">
              <td className="py-1">{r.label}</td>
              <td>{formatInt(r.visits)}</td>
              <td>{formatInt(r.users)}</td>
              <td>{formatInt(r.goalReaches)}</td>
              <td>{formatPercent(r.conversionRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Pure presentational Audience view: geo (country) + device breakdown tables. */
export function AudienceView({
  status,
  stats,
}: {
  status: QueryStatus;
  stats: GeoDeviceStat[];
}): JSX.Element {
  if (status === 'pending') return <p className="text-slate-500">Загрузка…</p>;
  if (status === 'error')
    return (
      <p role="alert" className="text-red-600">
        Не удалось загрузить аудиторию.
      </p>
    );

  const countries = byCountry(stats);
  const devices = byDevice(stats);
  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <EChart option={audienceBarOption(countries, 'Топ стран по визитам')} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <EChart option={deviceShareOption(devices)} />
        </div>
      </div>
      <AudienceTable title="Страна" rows={countries} />
      <AudienceTable title="Устройство" rows={devices} />
    </section>
  );
}

/** Data wrapper. */
export function Audience(): JSX.Element {
  const { from, to } = useFilters();
  const q = useQuery({
    queryKey: ['geo-device', from, to],
    queryFn: () => api.geoDevice({ from, to }),
  });
  return <AudienceView status={q.status} stats={q.data ?? []} />;
}
