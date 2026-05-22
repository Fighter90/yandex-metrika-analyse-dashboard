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
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Traffic')).toBeInTheDocument();
    expect(screen.getByText('Audience')).toBeInTheDocument();
    expect(screen.getByText('Behavior')).toBeInTheDocument();
    expect(screen.getByText('Trends')).toBeInTheDocument();
    // 'B2B' also appears as a FilterBar segment option, so match the nav link specifically.
    expect(screen.getByRole('link', { name: 'B2B' })).toBeInTheDocument();
    expect(screen.getByText('Decisions')).toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();
    expect(screen.getByText('Sources')).toBeInTheDocument();
    expect(screen.getByText('HOME CONTENT')).toBeInTheDocument();
  });
});
