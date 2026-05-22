-- Geo (country) + device-category breakdown, kept separate from channel_stats/utm_stats (a distinct
-- aggregation — summing would double-count visits). Missing dimensions are normalised to '(none)'.
-- History accumulates per day via the date column.
CREATE TABLE geo_device_stats (
  date TEXT NOT NULL,
  country TEXT NOT NULL,
  device TEXT NOT NULL,
  visits INTEGER NOT NULL,
  users INTEGER NOT NULL,
  goal_reaches INTEGER NOT NULL,
  conversion_rate REAL NOT NULL,
  PRIMARY KEY (date, country, device)
);
