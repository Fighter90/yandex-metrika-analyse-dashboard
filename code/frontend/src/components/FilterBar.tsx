import { useFilters, type Segment, formatDateLabel } from '../store/filters';
import { useState } from 'react';

const PRESETS = [7, 14, 30] as const;

/** Event name for triggering report rebuild from filter bar. */
export const REBUILD_REPORT_EVENT = 'rebuild-report';

/** Sticky global filter header: period presets, custom date picker, segment toggle, archived toggle, report rebuild. */
export function FilterBar(): JSX.Element {
  const { from, to, segment, showArchived, setRange, setSegment, toggleArchived, preset } =
    useFilters();
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  const handleCustomApply = () => {
    setRange(customFrom, customTo);
    setShowCustom(false);
  };

  const handleRebuildReport = () => {
    window.dispatchEvent(new CustomEvent(REBUILD_REPORT_EVENT));
  };

  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur">
      <span className="font-mono text-sm text-slate-600">
        {formatDateLabel(from)} — {formatDateLabel(to)}
      </span>
      {PRESETS.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => {
            setShowCustom(false);
            preset(d);
          }}
          className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-100"
        >
          {d}д
        </button>
      ))}
      <button
        type="button"
        onClick={() => setShowCustom(!showCustom)}
        className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-100"
      >
        📅 Выбрать даты
      </button>
      {showCustom && (
        <div className="flex items-center gap-2 rounded border border-indigo-200 bg-indigo-50 px-3 py-1">
          <label className="text-xs text-indigo-700">От:</label>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded border border-indigo-300 px-2 py-1 text-sm"
          />
          <label className="text-xs text-indigo-700">До:</label>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded border border-indigo-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={handleCustomApply}
            className="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
          >
            Применить
          </button>
          <button
            type="button"
            onClick={() => setShowCustom(false)}
            className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
      )}
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
      <label className="flex items-center gap-1 text-sm text-slate-600">
        <input type="checkbox" checked={showArchived} onChange={toggleArchived} /> архивные цели
      </label>
      <button
        type="button"
        onClick={handleRebuildReport}
        className="rounded bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-700"
        title="Перестроить отчёт с текущими фильтрами"
      >
        🔄 Перестроить отчёт
      </button>
    </header>
  );
}
