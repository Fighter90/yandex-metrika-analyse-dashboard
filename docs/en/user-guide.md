# User guide

> [🇷🇺 Русский](../user-guide.md) · 🇬🇧 English

How to use the dashboard and generate reports. For the "Conversions & lead-gen" track team.

> ✅ **Status: working product (v2.8.1).** A 9-page dashboard: Overview, Traffic, Behavior, Funnel,
> Goals, Report, History, Settings, Help. Global filters up to 1 year (mobile: bottom-sheet),
> AI report analysis (including AI-generated hypotheses and AI Decision Log), GOST-formatted DOCX/PDF
> **with embedded chart images** (channel bar, funnel, channel mix) and a 🟢/🔴 block per chart.
> B2B pipeline (kanban + drawer) lives in Settings. WCAG AA accessibility. Run with `./setup.sh`.

## 1. What it is and why

The tool answers one question: **where do paid tickets come from, and how do we reach 300?**
It does not replace Yandex Metrika — it turns its raw goals into a clear picture: a per-channel
breakdown, a "visit → application → payment" funnel, and hypothesis discipline.

Core principle: **an application ≠ a payment**. A Metrika goal (application) and an actual
payment are kept distinct everywhere in the UI.

## 2. Running

See [runbook.md](runbook.md). In short: `./setup.sh` (or `pnpm install && ./init.sh && ./run.sh`) →
browser at `http://localhost:5173`.

## 3. Dashboard pages

The dashboard has **9 pages** (top nav; on screens < 1024px a hamburger menu).

Global filters (header, on every page except Settings and Help): period presets
**7d / 14d / 30d / 90d / 1y**, custom date picker (from/to, max 365 days), segment toggle
**B2C / B2C+B2B / B2B**, "Archived goals" checkbox.

| Page         | URL         | What it shows                                                                                                                                                                                                                         |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overview** | `/`         | KPI strip (target 300; **«Оплат»** label for purchase/payment goals); **weekly digest card** (visits + applications WoW delta, top channel, top weak spot); daily charts; channel mix; weak spots; **chart captions** 🟢/🔴/💡        |
| **Traffic**  | `/traffic`  | channel bar chart; visits vs applications; channel table with CR; **UTM-Sankey** ("Flow: source → campaign → applications"); insights; chart captions                                                                                 |
| **Behavior** | `/behavior` | entry (startURL) and exit (exitURL) pages: charts + tables (visits / bounce rate / applications / CR); recommendations; chart captions                                                                                                |
| **Funnel**   | `/funnel`   | «application ≠ payment» funnel: Visits → B2C applications → B2B pipeline → B2B paid; **funnel by channel**; **CR by channel**; loss analysis; B2B by stage; chart captions                                                            |
| **Goals**    | `/goals`    | progress ring to 300 tickets; metrics; B2B deals; data-driven recommendations                                                                                                                                                         |
| **Report**   | `/report`   | build a snapshot; **AI-generated hypotheses** (problem + solution, «Growth Hypotheses (AI)» sections) and **AI Decision Log** embedded in the report; AI analysis (5 sections, HTML); full report on screen; export DOCX/PDF; rebuild |
| **History**  | `/history`  | list of saved snapshots (horizontally scrollable); "View" opens a snapshot without regenerating                                                                                                                                       |
| **Settings** | `/settings` | OAuth token, Client ID/Secret, COUNTER_ID, GOAL_ID (select from Metrika), ANTHROPIC_API_KEY; "🔄 Sync now" with a progress bar; collapsible **«B2B Pipeline»** section for manual B2B deal entry                                      |
| **Help**     | `/help`     | built-in documentation: all pages, filters, FAQ, glossary                                                                                                                                                                             |

> `/hypotheses` and `/decisions` redirect to `/report`; `/b2b` redirects to `/settings`. Settings and Help have no filter bar.

### Chart captions (v2.6.0)

Every chart and table in the dashboard now has a three-line caption block:

- **🟢 Correct** — the SQLite data source and what it represents.
- **🔴 Attention** — a known limitation (e.g. exitURL is not returned by Metrika).
- **💡 Recommendation** — what to check or how to act on the data.

This extends the anti-hallucination principle: users see not just a number but its origin.

### Weekly digest (Overview page)

A card at the top of the Overview page shows the last 7 days:
visits and applications with a WoW delta (vs the previous 7 days), the top channel by visits,
and the top weak spot. Data comes from `channel_stats`.

### Limitation: exit pages

Yandex Metrika does not return `ym:s:exitURL` for the ProductCamp counter, so the
`exit_page_stats` table remains empty. The "Exit pages" block hides automatically when there
is no data — this is a known API limitation, not a bug (see the 🔴 caption under the block).

### Where does this number come from?

Every number on the dashboard and in the report traces back to the raw Metrika response in
`raw_responses` (SQLite). No invented numbers — this is the anti-hallucination invariant.

## 4. Hypotheses and Decision Log (AI inside the report)

As of v2.7.0 there are no standalone Hypotheses or Decisions pages in the nav. Instead:

- **AI-generated hypotheses** (problem and solution) are generated when building a snapshot and
  stored in `snapshot.generatedHypotheses`. They appear in the report under the sections
  «Solution Hypotheses (AI)» / «Problem Hypotheses (AI)» in the structured methodology format
  (ICE, assumptions, validation methods, traffic light).
- **AI Decision Log** (suggested decisions) is generated similarly and stored in
  `snapshot.generatedDecisions`. It appears in the report under «Decision Log (suggested decisions)».

Both blocks are visible in the **on-screen report** and exported to DOCX/PDF.
Direct URLs `/hypotheses` and `/decisions` redirect to `/report`.

## 5. B2B pipeline (in Settings)

Manual B2B deal entry has moved to a collapsible **«B2B Pipeline»** section on the **Settings**
page (`/settings`). Stages: lead → negotiation → invoiced → paid. Paid tickets still count toward
the 300 KPI and are included on the Funnel and Goals pages.
The direct URL `/b2b` redirects to `/settings`.

## 6. Generating reports (including AI hypotheses and AI Decision Log)

On the **Report** page:

1. Pick the period in the header, then click **"Build snapshot"** — this builds and stores an
   immutable `ReportSnapshot`, shows the KPI summary and **renders the full report on screen**
   (the same content as the DOCX/PDF).
2. (Optional) **"Generate AI analysis"** — calls Anthropic from the snapshot numbers and adds a
   clearly-labelled «AI analysis» section. Needs `ANTHROPIC_API_KEY`; without it you get a clear
   message and the report is built without that section.
3. **Export DOCX** or **Export PDF** — renders the file into `data/reports/{snapshotId}.{docx|pdf}`.

The report is **detailed** and GOST-formatted (Times New Roman 14pt, title page, table of contents,
numbered sections, page numbers; markdown is supported — tables, bold/italic, lists). Sections:
Cover, Executive Summary (application ≠ payment), Methodology, Visit→application→payment funnel,
Channel analysis, **Solution/Problem Hypotheses (AI)** (from `snapshot.generatedHypotheses`),
**Decision Log (suggested decisions)** (from `snapshot.generatedDecisions`), AI analysis (if
generated), top breakdowns (UTM, geo+device, entry/exit pages), Data Appendix.

Reports are built from the immutable **snapshot**: the same `snapshotId` yields the same content in
DOCX, PDF and on screen (no `Date.now()`/LLM in the render path — the AI narrative is generated once
and stored; content comes from one shared `reportSections` in `@pca/shared`). PDF needs a local
Chrome via `PUPPETEER_EXECUTABLE_PATH`; DOCX needs nothing extra.

## 7. Principles to remember

- Every number traces back to `raw_responses` — if it doesn't, that's a bug.
- B2B is part of the 300 KPI and is managed manually via the «B2B Pipeline» section in Settings (the `b2b_manual` table, CRUD via `POST /api/b2b`).
- Methodology under `.claude/skills/` must not change without a note in
  `docs/methodology-hypotheses.md`.
