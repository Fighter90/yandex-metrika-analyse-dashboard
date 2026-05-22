-- UTM-source/medium/campaign breakdown, kept separate from channel_stats (different aggregation —
-- summing the two would double-count). Missing UTM dimensions are normalised to '(none)' so the
-- composite key has no NULLs. History accumulates per day via the date column.
CREATE TABLE utm_stats (
  date TEXT NOT NULL,
  utm_source TEXT NOT NULL,
  utm_medium TEXT NOT NULL,
  utm_campaign TEXT NOT NULL,
  visits INTEGER NOT NULL,
  users INTEGER NOT NULL,
  goal_reaches INTEGER NOT NULL,
  conversion_rate REAL NOT NULL,
  PRIMARY KEY (date, utm_source, utm_medium, utm_campaign)
);
