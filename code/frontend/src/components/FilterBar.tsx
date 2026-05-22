import { useFilters, type Segment } from '../store/filters';

const PRESETS = [7, 14] as const;

/** Sticky global filter header: period presets, segment toggle, archived toggle. */
export function FilterBar(): JSX.Element {
  const { from, to, segment, showArchived, preset, setSegment, toggleArchived } = useFilters();
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur">
      <span className="font-mono text-sm text-slate-600">
        {from} — {to}
      </span>
      {PRESETS.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => preset(d)}
          className="rounded border border-slate-300 px-2 py-1 text-sm hover:bg-slate-100"
        >
          {d}д
        </button>
      ))}
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
    </header>
  );
}
