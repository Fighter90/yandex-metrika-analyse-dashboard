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
    expect(screen.getByText('Decisions')).toBeInTheDocument();
    expect(screen.getByText('HOME CONTENT')).toBeInTheDocument();
  });
});
