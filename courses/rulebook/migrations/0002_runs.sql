CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  trigger TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  outcome TEXT NOT NULL CHECK (
    outcome IN ('started', 'skipped', 'succeeded', 'failed', 'crashed', 'interrupted', 'abandoned')
  ),
  reason TEXT CHECK (reason IN ('status', 'timeout', 'io')),
  error TEXT
);

CREATE INDEX runs_rule_id_started_at ON runs (rule_id, started_at);
