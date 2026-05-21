CREATE TABLE report_snapshots (
  id TEXT PRIMARY KEY,            -- ulid
  generated_at TEXT NOT NULL,
  date_from TEXT NOT NULL,
  date_to TEXT NOT NULL,
  payload JSON NOT NULL,
  docx_path TEXT,
  pdf_path TEXT
);
