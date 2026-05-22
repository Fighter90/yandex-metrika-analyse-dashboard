# User guide

> [🇷🇺 Русский](../user-guide.md) · 🇬🇧 English

How to use the dashboard and generate reports. For the "Conversions & lead-gen" track team.

> ✅ **Status: working product (v0.8.0).** All pages below, live Metrika sync, deterministic
> DOCX/PDF reports and the optional AI analysis are available. Run with `./setup.sh`.

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

Global filters (header): date range (7d / 14d / since camp start / custom), channels,
B2C / B2C+B2B / B2B toggle, show-archived-goals toggle, "Sync now" button.

| Page           | What it shows                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Overview**   | KPI strip (target 300, actual, forecast), Daily Sales, channel mix, weak spots, hypotheses in progress, latest decisions |
| **Traffic**    | channel bar chart + UTM breakdown table, low-UTM-coverage badge                                                          |
| **Audience**   | country + device charts and tables: visits / users / applications / CR                                                   |
| **Behavior**   | entry (startURL) and exit (exitURL) pages: charts + tables (visits / bounce rate / applications / CR)                    |
| **Trends**     | daily visits & applications line + week-over-week (WoW) comparison with arrows                                           |
| **Funnel**     | «application ≠ payment» funnel: Visits → B2C applications → B2B tickets (pipeline) → B2B paid, stage-by-stage conversion |
| **Report**     | build an immutable snapshot, optional AI analysis, export DOCX/PDF                                                       |
| **B2B**        | deals CRUD table, pipeline by stage                                                                                      |
| **Hypotheses** | Double Diamond + Voronkova hypothesis editor (below)                                                                     |
| **Decisions**  | Decision Log: DL-{N} cards, timeline, filter by outcome                                                                  |
| **Sources**    | "Where does this number come from?" — look up a raw Metrika response by `raw_response_id`                                |

### Where does this number come from?

Every number gets a "Where does this number come from?" debug panel showing the Metrika query
and the `raw_response_id` in SQLite. No invented numbers.

## 4. Working with hypotheses

A hypothesis is saved only in the full Voronkova format. The UI blocks saving until there are:

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

The report is **detailed (≥25 A4 pages)** — each section starts on a new page. Sections: Cover,
Executive Summary (application ≠ payment), Methodology, Visit→application→payment funnel, Channel
analysis, ICE prioritization, Define (a full card per problem hypothesis), Develop (a full card per
solution hypothesis), Deliver/Decision Log (findings, evidence, outcome, next step), AI analysis (if
generated), top breakdowns (UTM, geo+device, entry/exit pages), Roadmap, Glossary, Data Appendix.
Every hypothesis is spelled out in full: Voronkova statement, hidden assumptions by category,
validation methods, the ICE breakdown with a rationale per factor, traffic-light criteria, deadline
and status — with a detailed justification per item.

Reports are built from the immutable **snapshot**: the same `snapshotId` yields the same content in
DOCX, PDF and on screen (no `Date.now()`/LLM in the render path — the AI narrative is generated once
and stored; content comes from one shared `reportSections` in `@pca/shared`). PDF needs a local
Chrome via `PUPPETEER_EXECUTABLE_PATH`; DOCX needs nothing extra.

## 7. Principles to remember

- Every number traces back to `raw_responses` — if it doesn't, that's a bug.
- B2B is part of the 300 KPI and is managed manually on the B2B page.
- Methodology under `.claude/skills/` must not change without a note in
  `docs/methodology-hypothesis-voronik.md`.
