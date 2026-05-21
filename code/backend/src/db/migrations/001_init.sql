CREATE TABLE goals (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  is_b2b BOOLEAN DEFAULT 0,
  is_archived BOOLEAN DEFAULT 0,
  synced_at TEXT NOT NULL
);

CREATE TABLE raw_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL,
  query_hash TEXT NOT NULL,
  date_from TEXT NOT NULL,
  date_to TEXT NOT NULL,
  payload JSON NOT NULL,
  fetched_at TEXT NOT NULL,
  UNIQUE(query_hash, date_from, date_to)
);
CREATE INDEX idx_raw_query ON raw_responses(query_hash, date_from);

CREATE TABLE channel_stats (
  date TEXT NOT NULL,
  channel TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  visits INTEGER NOT NULL,
  users INTEGER NOT NULL,
  bounce_rate REAL NOT NULL,
  avg_duration REAL NOT NULL,
  goal_reaches INTEGER NOT NULL,
  conversion_rate REAL NOT NULL,
  PRIMARY KEY (date, channel, utm_source, utm_medium, utm_campaign)
);
