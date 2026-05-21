-- Hypotheses in the Voronkova format.
CREATE TABLE hypotheses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diamond_phase TEXT NOT NULL CHECK(diamond_phase IN ('define','develop')),
  kind TEXT NOT NULL CHECK(kind IN ('problem','solution')),

  -- «{subject} {action} {solution}, если {condition}»
  subject TEXT NOT NULL,
  action TEXT NOT NULL,
  solution TEXT NOT NULL,
  condition TEXT NOT NULL,

  title TEXT NOT NULL,
  description TEXT,

  parent_id INTEGER REFERENCES hypotheses(id),

  -- >=3 assumptions across behavior/market/tech (enforced in repo)
  hidden_assumptions JSON NOT NULL,
  -- >=2 distinct validation methods (enforced in repo)
  validation_methods JSON NOT NULL,

  impact INTEGER NOT NULL CHECK(impact BETWEEN 1 AND 10),
  confidence INTEGER NOT NULL CHECK(confidence BETWEEN 1 AND 10),
  ease INTEGER NOT NULL CHECK(ease BETWEEN 1 AND 10),
  impact_rationale TEXT NOT NULL,
  confidence_rationale TEXT NOT NULL,
  ease_rationale TEXT NOT NULL,
  ice_score INTEGER GENERATED ALWAYS AS (impact * confidence * ease) STORED,

  green_criteria TEXT NOT NULL,
  yellow_criteria TEXT NOT NULL,
  red_criteria TEXT NOT NULL,

  deadline_days INTEGER NOT NULL,
  deadline_at TEXT NOT NULL,

  evidence JSON,

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','in_progress','green','yellow','red','expired')),

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_hyp_phase ON hypotheses(diamond_phase, kind, status);
CREATE INDEX idx_hyp_ice ON hypotheses(ice_score DESC);
