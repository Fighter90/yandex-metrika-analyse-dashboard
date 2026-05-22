import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Funnel, Decisions } from './placeholders';

describe('placeholder pages', () => {
  it('render their titles', () => {
    render(
      <>
        <Funnel />
        <Decisions />
      </>,
    );
    for (const title of ['Funnel', 'Decisions']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });
});
