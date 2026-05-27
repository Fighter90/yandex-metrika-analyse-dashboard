import ReactECharts from 'echarts-for-react';
import '../../lib/echarts-theme'; // registers the «pca» theme (side-effect import)

/** Thin ECharts wrapper so option-building stays in pure, testable functions. */
export function EChart({ option, height = 300 }: { option: object; height?: number }): JSX.Element {
  return <ReactECharts option={option} style={{ height }} theme="pca" notMerge lazyUpdate />;
}
