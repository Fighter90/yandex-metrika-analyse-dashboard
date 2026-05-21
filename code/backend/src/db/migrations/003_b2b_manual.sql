CREATE TABLE b2b_manual (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  tickets INTEGER NOT NULL,
  stage TEXT NOT NULL CHECK(stage IN ('lead','negotiation','invoiced','paid')),
  amount_rub REAL,
  contact_email TEXT,
  notes TEXT,
  date_added TEXT NOT NULL,
  date_paid TEXT
);
