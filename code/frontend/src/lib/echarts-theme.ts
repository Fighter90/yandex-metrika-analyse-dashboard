import * as echarts from 'echarts';
import { METRIC_COLORS } from './chart-colors';

/**
 * Single ECharts theme «pca» so every chart shares fonts, axis styling and a default palette.
 * Per-series channel colours are still set explicitly (see chart-colors); this palette is the
 * fallback for series without an explicit colour. Registered once at import.
 */
export const PCA_THEME = {
  color: [
    METRIC_COLORS.applications,
    METRIC_COLORS.payments,
    METRIC_COLORS.visits,
    METRIC_COLORS.b2bPipeline,
    METRIC_COLORS.gap,
  ],
  backgroundColor: 'transparent',
  textStyle: { fontFamily: 'inherit', color: '#334155' },
  title: { textStyle: { color: '#0f172a' } },
  legend: { textStyle: { color: '#334155' } },
  axisPointer: { lineStyle: { color: '#94a3b8' } },
  categoryAxis: { axisLine: { lineStyle: { color: '#cbd5e1' } } },
  valueAxis: { splitLine: { lineStyle: { color: '#e2e8f0' } } },
} as const;

echarts.registerTheme('pca', PCA_THEME);
