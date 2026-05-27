import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import puppeteer from 'puppeteer-core';
import {
  REPORT_CHART_IDS,
  reportChartOption,
  type ReportCharts,
  type ReportSnapshot,
} from '@pca/shared';
import { findChromePath } from './pdf/renderer';

/**
 * Render the report's charts to PNG (base64) via headless Chrome + ECharts (FINAL §6.4, ADR-008
 * variant A). Deterministic by construction: option objects are pure functions of the snapshot and
 * animations are disabled. Excluded from coverage — launches a real browser and reads ECharts from
 * disk; verified via e2e + manual report inspection. On any failure returns {} so report generation
 * degrades to text/tables rather than failing.
 */
export async function renderReportCharts(snapshot: ReportSnapshot): Promise<ReportCharts> {
  const executablePath = findChromePath();
  if (!executablePath) return {};

  // ECharts ships with the frontend workspace; resolve its UMD bundle and inline it into the page.
  const require = createRequire(import.meta.url);
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
  let echartsScript: string;
  try {
    const echartsPath = require.resolve('echarts/dist/echarts.min.js', {
      paths: [join(repoRoot, 'code/frontend')],
    });
    echartsScript = readFileSync(echartsPath, 'utf8');
  } catch {
    return {};
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 820, height: 480, deviceScaleFactor: 2 });
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"><style>` +
        `*{margin:0}#c{width:800px;height:460px}</style>` +
        `<script>${echartsScript}</script></head><body><div id="c"></div></body></html>`,
      { waitUntil: 'load' },
    );

    const charts: ReportCharts = {};
    for (const id of REPORT_CHART_IDS) {
      const option = reportChartOption(snapshot, id);
      await page.evaluate(
        (opt) => {
          const el = document.getElementById('c');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ec = (window as any).echarts;
          ec.dispose(el);
          ec.init(el).setOption({ ...opt, animation: false });
        },
        option as unknown as Record<string, unknown>,
      );
      const el = await page.$('#c');
      if (!el) continue;
      const buf = (await el.screenshot({ type: 'png' })) as Buffer;
      charts[id] = Buffer.from(buf).toString('base64');
    }
    return charts;
  } finally {
    await browser.close();
  }
}
