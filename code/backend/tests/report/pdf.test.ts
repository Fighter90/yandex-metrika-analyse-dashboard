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
  breakdowns: { utm: [], geoDevice: [], entryPages: [], exitPages: [] },
};

describe('reportHtml', () => {
  it('produces a ГОСТ-formatted HTML document (cover, TOC, numbered sections, A4/Times New Roman)', () => {
    const html = reportHtml(snapshot);
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('@page{size:A4;margin:20mm 15mm 20mm 30mm}');
    expect(html).toContain(
      "font-family:'Times New Roman',Times,serif;font-size:14pt;line-height:1.5",
    );
    expect(html).toContain('class="cover"');
    expect(html).toContain('Содержание');
    expect(html).toContain('Период: 2025-01-01 — 2025-01-07');
    expect(html).toContain('<h1>1. Executive Summary</h1>');
    expect(html).toContain('<li>1. Executive Summary</li>');
  });

  it('escapes &, < and > in content', () => {
    expect(reportHtml(snapshot)).toContain('a&lt;b&gt;&amp;c');
  });
});
