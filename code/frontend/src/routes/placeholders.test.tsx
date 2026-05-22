import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Funnel, Hypotheses, Decisions } from './placeholders';

describe('placeholder pages', () => {
  it('render their titles', () => {
    render(
      <>
        <Funnel />
        <Hypotheses />
        <Decisions />
      </>,
    );
    for (const title of ['Funnel', 'Hypotheses', 'Decisions']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });
});
