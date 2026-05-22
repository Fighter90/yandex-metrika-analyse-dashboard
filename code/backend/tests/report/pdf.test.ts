import { describe, it, expect } from 'vitest';
import type { ReportSnapshot } from '@pca/shared';
import { reportHtml } from '../../src/report/pdf/html';

const snapshot: ReportSnapshot = {
  id: 'snap-1',
  generatedAt: 'T',
  period: { from: '2025-01-01', to: '2025-01-07' },
  kpi: { target: 300, b2cApplications: 7, b2bPaidTickets: 20, gap: 280 },
  channels: [],
  hypotheses: {
    problems: [
      {
        id: 1,
        diamondPhase: 'define',
        kind: 'problem',
        subject: 'a<b>&c', // exercises HTML escaping
        action: 'не покупает',
        solution: 'билет',
        condition: 'нет лендинга',
        title: 't',
        hiddenAssumptions: [],
        validationMethods: [],
        impact: 8,
        confidence: 6,
        ease: 7,
        impactRationale: 'r',
        confidenceRationale: 'r',
        easeRationale: 'r',
        iceScore: 336,
        greenCriteria: 'g',
        yellowCriteria: 'y',
        redCriteria: 'r',
        deadlineDays: 5,
        deadlineAt: '2999-01-01T00:00:00.000Z',
        status: 'draft',
        createdAt: 'c',
        updatedAt: 'u',
      },
    ],
    solutions: [],
  },
  decisions: [],
};

describe('reportHtml', () => {
  it('produces an HTML document with the report sections', () => {
    const html = reportHtml(snapshot);
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<h1>Executive Summary</h1>');
    expect(html).toContain('ProductCamp · Конверсии и лидген · 2025-01-01 — 2025-01-07');
  });

  it('escapes &, < and > in content', () => {
    expect(reportHtml(snapshot)).toContain('a&lt;b&gt;&amp;c');
  });
});
