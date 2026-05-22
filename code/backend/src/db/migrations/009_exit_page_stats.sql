-- Exit-page (ym:s:exitURL) behaviour: visits + bounce rate per page where sessions ended. Kept in a
-- separate table from page_stats (entry pages) — a distinct aggregation, summing would double-count.
-- Missing pages are normalised to '(none)'. History accumulates per day via the date column.
CREATE TABLE exit_page_stats (
  date TEXT NOT NULL,
  page TEXT NOT NULL,
  visits INTEGER NOT NULL,
  users INTEGER NOT NULL,
  bounce_rate REAL NOT NULL,
  goal_reaches INTEGER NOT NULL,
  conversion_rate REAL NOT NULL,
  PRIMARY KEY (date, page)
);
