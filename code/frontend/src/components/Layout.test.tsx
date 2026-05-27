import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './Layout';
import { renderWithProviders } from '../test/utils';

describe('Layout', () => {
  it('renders the nav and the routed outlet', () => {
    renderWithProviders(
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<div>HOME CONTENT</div>} />
        </Route>
      </Routes>,
    );
    // Nav items should be in the document (may be in mobile menu or desktop)
    expect(screen.getByText('HOME CONTENT')).toBeInTheDocument();
    // At least some nav items should be visible
    const navLinks = screen.getAllByRole('link');
    expect(navLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the hamburger button for mobile', () => {
    renderWithProviders(
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<div>HOME CONTENT</div>} />
        </Route>
      </Routes>,
    );
    // Hamburger button should exist
    expect(screen.getByRole('button', { name: /открыть меню/i })).toBeInTheDocument();
  });

  it('toggles the mobile menu open and closed on hamburger click', () => {
    renderWithProviders(
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<div>HOME CONTENT</div>} />
          <Route path="traffic" element={<div>TRAFFIC PAGE</div>} />
        </Route>
      </Routes>,
    );
    const hamburger = screen.getByRole('button', { name: /открыть меню/i });
    // Menu is initially closed — mobile dropdown not rendered
    expect(screen.queryByRole('button', { name: /закрыть меню/i })).not.toBeInTheDocument();
    // Click to open
    fireEvent.click(hamburger);
    // Button label changes to "Закрыть меню" when open
    expect(screen.getByRole('button', { name: /закрыть меню/i })).toBeInTheDocument();
    // The mobile dropdown links should be visible (multiple Трафик links: desktop + mobile)
    const trafficLinks = screen.getAllByRole('link', { name: 'Трафик' });
    expect(trafficLinks.length).toBeGreaterThanOrEqual(1);
    // Click a mobile nav link to close the menu (invokes () => setMenuOpen(false))
    fireEvent.click(trafficLinks[trafficLinks.length - 1]!);
    expect(screen.getByRole('button', { name: /открыть меню/i })).toBeInTheDocument();
  });

  it('hides FilterBar on NO_FILTER_PAGES (e.g. /help)', () => {
    renderWithProviders(
      <Routes>
        <Route element={<Layout />}>
          <Route path="help" element={<div>HELP PAGE</div>} />
        </Route>
      </Routes>,
      '/help',
    );
    expect(screen.getByText('HELP PAGE')).toBeInTheDocument();
    // FilterBar preset buttons should NOT be visible on /help
    expect(screen.queryByText('7д')).not.toBeInTheDocument();
  });
});
