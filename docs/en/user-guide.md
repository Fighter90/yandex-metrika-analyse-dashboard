# User guide

> [🇷🇺 Русский](../user-guide.md) · 🇬🇧 English

How to use the dashboard and generate reports. For the "Conversions & lead-gen" track team.

> ✅ **Status: working product (v2.5.5).** A 9-page dashboard: Overview, Traffic, Behavior, Funnel,
> Goals, Report, History, Settings, Help. Global filters up to 1 year, AI report analysis,
> GOST-formatted DOCX/PDF. Run with `./setup.sh`.

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

| Page         | URL         | What it shows                                                                                                                                                     |
| ------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overview** | `/`         | KPI strip (target 300, applications, gap), daily visits/applications charts, channel mix, top countries, device share, weak spots, colored insight badges (🟢/🔴) |
| **Traffic**  | `/traffic`  | channel bar chart, visits vs applications, channel table with CR, UTM breakdown, low-UTM-coverage badge, insights                                                 |
| **Behavior** | `/behavior` | entry (startURL) and exit (exitURL) pages: charts + tables (visits / bounce rate / applications / CR), recommendations                                            |
| **Funnel**   | `/funnel`   | «application ≠ payment» funnel: Visits → B2C applications → B2B pipeline → B2B paid, loss analysis, channel CR, B2B by stage                                      |
| **Goals**    | `/goals`    | progress ring to 300 tickets, metrics, B2B deals, data-driven recommendations                                                                                     |
| **Report**   | `/report`   | build a snapshot, AI analysis (5 sections, HTML), full report on screen, export DOCX/PDF, rebuild                                                                 |
| **History**  | `/history`  | list of saved snapshots by date; "View" opens a snapshot without regenerating                                                                                     |
| **Settings** | `/settings` | OAuth token, Client ID/Secret, COUNTER_ID, GOAL_ID (select from Metrika), ANTHROPIC_API_KEY; "🔄 Sync now" with a progress bar                                    |
| **Help**     | `/help`     | built-in documentation: all pages, filters, FAQ, glossary                                                                                                         |

> Settings and Help have no filter bar.

### Where does this number come from?

Every number on the dashboard and in the report traces back to the raw Metrika response in
`raw_responses` (SQLite). No invented numbers — this is the anti-hallucination invariant.

## 4. Working with hypotheses

A hypothesis is saved only in the full structured format. The UI blocks saving until there are:

1. **Format:** Subject (audience) · Action · Solution · Condition ("…, if …").
2. **≥3 hidden assumptions** covering **behavior / market / tech**.
3. **≥2 validation methods** (synthetic CustDev / live / quantitative / market).
4. **ICE** — three sliders Impact / Confidence / Ease (1–10), each with a one-line rationale.
   Result `I × C × E` (1–1000) with a colored priority badge.
5. **Traffic light** 🟢/🟡/🔴 — each with a concrete threshold and metric.
6. **Deadline** for verification (in days).

The "Generate hypothesis with skill" button explains how to structure a raw idea in Claude via
`.claude/skills/hypothesis-check/SKILL.md` and paste the fields. It is a helper, not automation.

## 5. Decision Log

Each verified hypothesis → a DL-{N} entry: what was tested, findings (3–5 points), quotes/data
(required), traffic-light outcome, next step. On save, the linked hypothesis status auto-updates
to the outcome (green/yellow/red). Entries can be exported to `data/decisions/DL-{N}.md`.

## 6. Generating reports

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
Channel analysis, ICE prioritization, Define (a full card per problem hypothesis), Develop (a full
card per solution hypothesis), Deliver/Decision Log (findings, evidence, outcome, next step), AI
analysis (if generated), top breakdowns (UTM, geo+device, entry/exit pages), Roadmap, Glossary, Data
Appendix. Every hypothesis is spelled out in full: structured hypothesis statement, hidden
assumptions by category, validation methods, the ICE breakdown with a rationale per factor,
traffic-light criteria, deadline and status.

Reports are built from the immutable **snapshot**: the same `snapshotId` yields the same content in
DOCX, PDF and on screen (no `Date.now()`/LLM in the render path — the AI narrative is generated once
and stored; content comes from one shared `reportSections` in `@pca/shared`). PDF needs a local
Chrome via `PUPPETEER_EXECUTABLE_PATH`; DOCX needs nothing extra.

## 7. Principles to remember

- Every number traces back to `raw_responses` — if it doesn't, that's a bug.
- B2B is part of the 300 KPI and is managed manually (the `b2b_manual` table, CRUD via
  `POST /api/b2b`; a dedicated B2B UI page is planned and not in the current nav).
- Methodology under `.claude/skills/` must not change without a note in
  `docs/methodology-hypotheses.md`.
