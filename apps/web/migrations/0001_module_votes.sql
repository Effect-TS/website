CREATE TABLE votes (
  module_id  TEXT    NOT NULL,
  voter_id   TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (module_id, voter_id)
);

CREATE INDEX votes_by_voter ON votes (voter_id);
