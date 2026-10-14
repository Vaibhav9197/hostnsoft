-- Feature votes: which upcoming features signed-in users want next.
--
-- Kept apart from customer queries on purpose. A query is a message someone
-- wrote; a vote is a tally. Mixing them made one submit read as several inbox
-- rows and left counting to whoever scrolled the inbox.
--
-- One row per user per feature. The primary key is the "one vote each" rule,
-- so a repeat vote from another browser or device is a no-op, not a second row.

CREATE TABLE IF NOT EXISTS feature_votes (
  user_id     TEXT NOT NULL,
  -- An id from app/lib/features.ts (e.g. "email"), never a display label, so
  -- renaming a feature keeps its votes.
  feature_id  TEXT NOT NULL,
  email       TEXT NOT NULL,
  -- The workspace that was active when they voted. Context only.
  company_id  TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_feature_votes_feature ON feature_votes (feature_id);
