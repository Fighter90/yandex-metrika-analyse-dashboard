import puppeteer from 'puppeteer-core';
import type { ReportSnapshot } from '@pca/shared';
import { reportHtml } from './html';

/**
 * Render a snapshot to PDF via headless Chrome (puppeteer-core — no bundled Chromium, so CI
 * installs stay fast). Excluded from coverage: launches a real browser. Needs a local Chrome —
 * set PUPPETEER_EXECUTABLE_PATH (see .env.example / docs/runbook.md).
 */
export async function buildPdf(snapshot: ReportSnapshot): Promise<Buffer> {
  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(reportHtml(snapshot), { waitUntil: 'load' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
