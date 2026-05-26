import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
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
});
