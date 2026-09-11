-- A/B metrics store, ported from the better-sqlite3 file this app used to keep
-- under DATA_DIR. D1 is SQLite, so the schema is unchanged apart from living
-- here instead of being created on demand at request time: a Worker has no
-- writable filesystem to lose, so there is nothing to recreate per deploy.

CREATE TABLE IF NOT EXISTS hero_assignments (
  visitor_id TEXT PRIMARY KEY,
  variant    TEXT NOT NULL,
  first_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hero_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT NOT NULL,
  variant    TEXT NOT NULL,
  event      TEXT NOT NULL,
  url        TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hero_events_variant ON hero_events(variant);
CREATE INDEX IF NOT EXISTS idx_hero_events_event   ON hero_events(event);

-- Legacy: the contact form now posts to hostnsoft-api's
-- /public/customer-query instead. Kept so /api/contact/list can still read the
-- rows written before that switch.
CREATE TABLE IF NOT EXISTS contact_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL,
  query      TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS variant_metrics (
  variant             TEXT PRIMARY KEY,
  page_views          INTEGER DEFAULT 0,
  cta_clicks          INTEGER DEFAULT 0,
  cta_copy            INTEGER DEFAULT 0,
  cta_login           INTEGER DEFAULT 0,
  cta_signup          INTEGER DEFAULT 0,
  deployments_success INTEGER DEFAULT 0,
  deployments_failed  INTEGER DEFAULT 0,
  signups             INTEGER DEFAULT 0,
  updated_at          TEXT DEFAULT CURRENT_TIMESTAMP
);
