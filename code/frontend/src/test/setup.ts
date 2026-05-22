import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// ECharts renders to a canvas, which jsdom does not implement — mock the wrapper.
vi.mock('echarts-for-react', () => ({
  default: () => React.createElement('div', { 'data-testid': 'echart' }),
}));

afterEach(() => {
  cleanup();
});
