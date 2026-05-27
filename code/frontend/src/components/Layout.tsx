import { useState, type ComponentType } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  MousePointerClick,
  Filter,
  Target,
  FileText,
  History as HistoryIcon,
  Settings as SettingsIcon,
  HelpCircle,
} from 'lucide-react';
import { FilterBar } from './FilterBar';

const NAV: ReadonlyArray<readonly [string, string, ComponentType<{ className?: string }>]> = [
  ['/', 'Обзор', LayoutDashboard],
  ['/traffic', 'Трафик', BarChart3],
  ['/behavior', 'Поведение', MousePointerClick],
  ['/funnel', 'Воронка', Filter],
  ['/goals', 'Цели', Target],
  ['/report', 'Отчёт', FileText],
  ['/history', 'История', HistoryIcon],
  ['/settings', 'Настройки', SettingsIcon],
  ['/help', 'Справка', HelpCircle],
];

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
          {NAV.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 ${
                  isActive ? 'font-medium text-white underline' : 'text-slate-300 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
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
          {NAV.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-slate-700 font-medium text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
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
