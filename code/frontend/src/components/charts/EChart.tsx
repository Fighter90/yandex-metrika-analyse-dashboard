import ReactECharts from 'echarts-for-react';

/** Thin ECharts wrapper so option-building stays in pure, testable functions. */
export function EChart({ option, height = 300 }: { option: object; height?: number }): JSX.Element {
  return <ReactECharts option={option} style={{ height }} notMerge lazyUpdate />;
}
