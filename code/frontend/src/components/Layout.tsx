import { NavLink, Outlet } from 'react-router-dom';
import { FilterBar } from './FilterBar';

const NAV = [
  ['/', 'Overview'],
  ['/traffic', 'Traffic'],
  ['/funnel', 'Funnel'],
  ['/hypotheses', 'Hypotheses'],
  ['/decisions', 'Decisions'],
] as const;

/** App shell: top nav + sticky filters + routed content. */
export function Layout(): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="flex items-center gap-4 bg-slate-900 px-6 py-3 text-sm text-slate-100">
        <span className="font-semibold">ProductCamp · Конверсии</span>
        {NAV.map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => (isActive ? 'text-white underline' : 'text-slate-300')}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <FilterBar />
      <main className="mx-auto max-w-6xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
