-- Decision Log (skill-decision-log.md).
CREATE TABLE decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,              -- "DL-001"
  hypothesis_id INTEGER NOT NULL REFERENCES hypotheses(id),
  date TEXT NOT NULL,

  method TEXT NOT NULL CHECK(method IN ('synthetic','live','quantitative','market','mixed')),
  scope TEXT NOT NULL,
  period_days INTEGER NOT NULL,

  findings JSON NOT NULL,
  evidence JSON NOT NULL,

  outcome TEXT NOT NULL CHECK(outcome IN ('green','yellow','red')),
  outcome_rationale TEXT NOT NULL,

  next_step TEXT NOT NULL,
  responsible TEXT,
  next_deadline TEXT,

  previous_decision_id INTEGER REFERENCES decisions(id),
  spawned_hypothesis_ids JSON,

  decided_by TEXT NOT NULL,
  participants TEXT,

  exported_md_path TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_dec_hyp ON decisions(hypothesis_id);
CREATE INDEX idx_dec_date ON decisions(date DESC);
