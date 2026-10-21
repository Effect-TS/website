CREATE TABLE rate_limits (
  key        TEXT    PRIMARY KEY,
  count      INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
