import { useFilters, type Segment, formatDateLabel } from '../store/filters';
import { useState } from 'react';

const PRESETS = [7, 14, 30, 90, 365] as const;
const MAX_DAYS = 365; // Maximum allowed period: 1 year

/** Calculate days between two dates. */
function daysBetween(from: string, to: string): number {
  const d1 = new Date(from);
  const d2 = new Date(to);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

/** Sticky global filter header: period presets, custom date picker, segment toggle, archived toggle. */
export function FilterBar(): JSX.Element {
  const { from, to, segment, showArchived, setRange, setSegment, toggleArchived, preset } =
    useFilters();
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const [dateError, setDateError] = useState('');

  const handleCustomApply = () => {
    const days = daysBetween(customFrom, customTo);
    if (days > MAX_DAYS) {
      setDateError(`Максимальный период — ${MAX_DAYS} дней (1 год).`);
      return;
    }
    if (days < 1) {
      setDateError('Дата окончания должна быть позже даты начала.');
      return;
    }
    setDateError('');
    setRange(customFrom, customTo);
    setShowCustom(false);
  };

  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur sm:px-6 sm:py-3">
      {/* Date display */}
      <span className="hidden font-mono text-sm text-slate-600 sm:block">
        {formatDateLabel(from)} — {formatDateLabel(to)}
      </span>

      {/* Preset buttons */}
      {PRESETS.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => {
            setShowCustom(false);
            setDateError('');
            preset(d);
          }}
          className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-100"
          title={
            d === 365
              ? 'Показать данные за последний год'
              : `Показать данные за последние ${d} дней`
          }
        >
          {d === 365 ? '1г' : `${d}д`}
        </button>
      ))}

      {/* Custom date picker */}
      <button
        type="button"
        onClick={() => {
          setShowCustom(!showCustom);
          setDateError('');
        }}
        className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-100"
        title="Выбрать произвольный период (макс. 365 дней)"
      >
        📅 Даты
      </button>
      {showCustom && (
        <div className="flex w-full flex-col gap-2 rounded border border-indigo-200 bg-indigo-50 px-3 py-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <label htmlFor="custom-date-from" className="text-xs text-indigo-700">
              От:
            </label>
            <input
              id="custom-date-from"
              type="date"
              value={customFrom}
              onChange={(e) => {
                setCustomFrom(e.target.value);
                setDateError('');
              }}
              className="rounded border border-indigo-300 px-2 py-1 text-sm"
            />
            <label htmlFor="custom-date-to" className="text-xs text-indigo-700">
              До:
            </label>
            <input
              id="custom-date-to"
              type="date"
              value={customTo}
              onChange={(e) => {
                setCustomTo(e.target.value);
                setDateError('');
              }}
              className="rounded border border-indigo-300 px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={handleCustomApply}
              className="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
            >
              Применить
            </button>
          </div>
          {dateError && <p className="text-xs text-red-600">{dateError}</p>}
          <p className="text-xs text-indigo-400">Макс. период: 365 дней (1 год)</p>
          <button
            type="button"
            onClick={() => setShowCustom(false)}
            className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Segment selector with tooltip */}
      <div className="group relative">
        <select
          aria-label="Сегмент"
          value={segment}
          onChange={(e) => setSegment(e.target.value as Segment)}
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="b2c">B2C</option>
          <option value="b2c_b2b">B2C+B2B</option>
          <option value="b2b">B2B</option>
        </select>
        {/* Tooltip */}
        <div className="absolute left-0 top-full z-20 mt-1 hidden w-64 rounded border border-slate-200 bg-white p-2 text-xs text-slate-600 shadow group-hover:block">
          <p>
            <b>B2C:</b> только потребительские каналы (Direct, Search, Social и др.)
          </p>
          <p className="mt-1">
            <b>B2C+B2B:</b> все каналы (по умолчанию)
          </p>
          <p className="mt-1">
            <b>B2B:</b> только B2B-каналы (если настроены)
          </p>
        </div>
      </div>

      {/* Archived goals checkbox with tooltip */}
      <div className="group relative">
        <label className="flex cursor-pointer items-center gap-1 text-sm text-slate-600">
          <input type="checkbox" checked={showArchived} onChange={toggleArchived} />
          Архивные цели
        </label>
        {/* Tooltip */}
        <div className="absolute left-0 top-full z-20 mt-1 hidden w-64 rounded border border-slate-200 bg-white p-2 text-xs text-slate-600 shadow group-hover:block">
          <p>
            Показывать цели Метрики, которые были удалены или заархивированы. По умолчанию — только
            активные цели.
          </p>
        </div>
      </div>
    </header>
  );
}
