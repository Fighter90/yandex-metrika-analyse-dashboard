import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Traffic, Funnel, Hypotheses, Decisions } from './placeholders';

describe('placeholder pages', () => {
  it('render their titles', () => {
    render(
      <>
        <Traffic />
        <Funnel />
        <Hypotheses />
        <Decisions />
      </>,
    );
    for (const title of ['Traffic', 'Funnel', 'Hypotheses', 'Decisions']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });
});
