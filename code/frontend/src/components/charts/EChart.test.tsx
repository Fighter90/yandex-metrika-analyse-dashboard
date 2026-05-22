import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EChart } from './EChart';

describe('EChart', () => {
  it('renders the (mocked) chart with default and explicit height', () => {
    render(<EChart option={{}} />);
    render(<EChart option={{ series: [] }} height={200} />);
    expect(screen.getAllByTestId('echart')).toHaveLength(2);
  });
});
