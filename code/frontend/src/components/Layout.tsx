import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { FilterBar } from './FilterBar';

const NAV = [
  ['/', 'Обзор'],
  ['/traffic', 'Трафик'],
  ['/behavior', 'Поведение'],
  ['/funnel', 'Воронка'],
  ['/goals', 'Цели'],
  ['/b2b', 'B2B'],
  ['/report', 'Отчёт'],
  ['/history', 'История'],
  ['/settings', 'Настройки'],
  ['/help', 'Справка'],
] as const;

/** Pages where the FilterBar should be hidden. */
const NO_FILTER_PAGES = new Set(['/help', '/settings']);

/** App shell: top nav + conditional filters + routed content. */
export function Layout(): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const showFilters = !NO_FILTER_PAGES.has(location.pathname);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top nav bar */}
      <nav className="flex items-center justify-between bg-slate-900 px-4 py-3 text-sm text-slate-100 lg:px-6">
        <span className="font-semibold">ProductCamp · Конверсии</span>

        {/* Desktop nav */}
        <div className="hidden items-center gap-3 lg:flex">
          {NAV.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                isActive ? 'font-medium text-white underline' : 'text-slate-300 hover:text-white'
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded p-1 text-slate-300 hover:text-white lg:hidden"
          aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
        >
          {menuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="border-b border-slate-700 bg-slate-800 px-4 py-2 lg:hidden">
          {NAV.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block rounded px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-slate-700 font-medium text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      )}

      {showFilters && <FilterBar />}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
