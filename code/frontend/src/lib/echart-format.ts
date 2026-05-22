import { formatInt } from './format';

/**
 * ECharts tooltip config that formats numeric values with thin-space thousands grouping (ru-RU),
 * so chart tooltips read «1 290» instead of «1290». Spread into a chart's `tooltip`.
 */
export const intTooltip = { valueFormatter: (value: number) => formatInt(value) };

/**
 * ECharts bar `series.label` config that prints the integer value on the bar (so numbers are visible
 * without hovering). Pass `'top'` for vertical bars, `'right'` for horizontal bars.
 */
export function intBarLabel(position: 'top' | 'right'): object {
  return { show: true, position, formatter: (p: { value: number }) => formatInt(p.value) };
}
