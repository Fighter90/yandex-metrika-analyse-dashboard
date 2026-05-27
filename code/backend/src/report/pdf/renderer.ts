import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import type { ReportSnapshot } from '@pca/shared';
import { reportHtml } from './html';

/** Find Chrome executable path across platforms. */
function findChromePath(): string | undefined {
  // Explicit env var takes priority
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;

  // macOS
  const macPaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  ];
  for (const p of macPaths) {
    if (existsSync(p)) return p;
  }

  // Linux
  const linuxPaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    '/snap/chromium/current/usr/lib/chromium-browser/chrome',
  ];
  for (const p of linuxPaths) {
    if (existsSync(p)) return p;
  }

  // Windows
  const winPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const p of winPaths) {
    if (existsSync(p)) return p;
  }

  return undefined;
}

/**
 * Render a snapshot to PDF via headless Chrome (puppeteer-core — no bundled Chromium, so CI
 * installs stay fast). Excluded from coverage: launches a real browser. Auto-detects Chrome
 * on macOS/Linux/Windows; falls back to PUPPETEER_EXECUTABLE_PATH env var.
 */
export async function buildPdf(snapshot: ReportSnapshot): Promise<Buffer> {
  const executablePath = findChromePath();
  if (!executablePath) {
    throw new Error(
      'Chrome not found. Set PUPPETEER_EXECUTABLE_PATH in .env to the Chrome executable path. ' +
        'On macOS: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    );
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
