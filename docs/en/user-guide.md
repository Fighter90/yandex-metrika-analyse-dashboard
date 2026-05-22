# User guide

> [🇷🇺 Русский](../user-guide.md) · 🇬🇧 English

How to use the dashboard and generate reports. For the "Conversions & lead-gen" track team.

> ⚠️ **Status.** The tool is built in iterations. Below marks what is available now
> (Iteration 0) and what comes later. The full workflow is described so the destination is clear.

## 1. What it is and why

The tool answers one question: **where do paid tickets come from, and how do we reach 300?**
It does not replace Yandex Metrika — it turns its raw goals into a clear picture: a per-channel
breakdown, a "visit → application → payment" funnel, and hypothesis discipline.

Core principle: **an application ≠ a payment**. A Metrika goal (application) and an actual
payment are kept distinct everywhere in the UI.

## 2. Running

See [runbook.md](runbook.md). In short: `./run.sh` → browser at `http://localhost:5173`.

**Available now (Iteration 0):** a landing page with backend + token status.

## 3. Dashboard pages _(Iterations 4–7)_

Global filters (header): date range (7d / 14d / since camp start / custom), channels,
B2C / B2C+B2B / B2B toggle, show-archived-goals toggle, "Sync now" button.

| Page           | What it shows                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Overview**   | KPI strip (target 300, actual, forecast), Daily Sales, channel mix, weak spots, hypotheses in progress, latest decisions |
| **Traffic**    | UTM Sankey, UTM table with CSV export, low-coverage badge, WoW                                                           |
| **Funnel**     | visit → registration → form → payment, drill-down by channel                                                             |
| **Behavior**   | page dropoff, hour heatmap, top-20 cities                                                                                |
| **Forms**      | per form: opens / started / submitted / biggest-dropout field                                                            |
| **B2B**        | deals CRUD table, pipeline by stage, forecast                                                                            |
| **Hypotheses** | Double Diamond + Voronkova hypothesis editor (below)                                                                     |
| **Decisions**  | Decision Log: DL-{N} cards, timeline, filter by outcome                                                                  |

### Where does this number come from?

Every number gets a "Where does this number come from?" debug panel showing the Metrika query
and the `raw_response_id` in SQLite. No invented numbers.

## 4. Working with hypotheses _(Iteration 6)_

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

## 5. Decision Log _(Iteration 7)_

Each verified hypothesis → a DL-{N} entry: what was tested, findings (3–5 points), quotes/data
(required), traffic-light outcome, next step. On save, the linked hypothesis status auto-updates
to the outcome (green/yellow/red). Entries can be exported to `data/decisions/DL-{N}.md`.

## 6. Generating reports _(Iterations 8–10)_

On the **Report Preview** page:

1. Pick the period and the data cut-off date.
2. Tick the sections (Cover, Executive Summary, Methodology, Discover, Define, Develop,
   Deliver, Data Appendix).
3. Click **Export DOCX** or **Export PDF**.

Via CLI without UI _(Iterations 9–10)_:

```bash
pnpm report --format=docx --from=2025-01-01 --to=2025-01-14
pnpm report --format=pdf  --from=2025-01-01 --to=2025-01-14
```

Reports are built from an immutable **snapshot**: the same `snapshotId` yields
**byte-identical** DOCX and PDF. The browser preview is the same page rendered into the PDF.
Files land in `data/reports/`.

## 7. Principles to remember

- Every number traces back to `raw_responses` — if it doesn't, that's a bug.
- B2B is part of the 300 KPI and is managed manually on the B2B page.
- Methodology under `.claude/skills/` must not change without a note in
  `docs/methodology-hypothesis-voronik.md`.
