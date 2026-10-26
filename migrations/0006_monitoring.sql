-- Monitoring: the history behind the admin Pulse page, the Slack reports and
-- the alerts. All three read these tables through app/lib/monitor/, so a
-- number means the same thing in every place it appears.
--
-- hostnsoft-api keeps no history of its own for most of this: an expired
-- temporary app is hard-deleted, a claim leaves no trace, and nothing is
-- counted per day. So the monitor checks every 5 minutes, compares what it
-- sees with what it saw last time, and writes down what changed.

-- Every app the monitor has seen, as it last saw it. Rows are never deleted:
-- gone_at marks an app that has left the platform, so an expired temporary
-- app still counts on the day it expired.
CREATE TABLE IF NOT EXISTS monitor_apps (
  slug            TEXT PRIMARY KEY,
  company         TEXT,
  -- 1 while the app is a temporary (no-login) app.
  is_temp         INTEGER NOT NULL DEFAULT 0,
  -- 1 if it was ever temporary. Survives the claim, so conversion stays countable.
  was_temp        INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT,
  status          TEXT,
  deploy_count    INTEGER NOT NULL DEFAULT 0,
  last_source     TEXT,
  last_agent      TEXT,
  first_seen_at   TEXT NOT NULL,
  last_seen_at    TEXT NOT NULL,
  claimed_at      TEXT,
  gone_at         TEXT
);

CREATE INDEX IF NOT EXISTS idx_monitor_apps_temp ON monitor_apps (is_temp, gone_at);

-- What changed between two checks. One row per thing that happened:
-- app_created, deploy, deploy_failed, temp_claimed, temp_expired,
-- app_deleted, workspace_first_app. Reports count these per period.
CREATE TABLE IF NOT EXISTS monitor_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  at          TEXT NOT NULL,
  kind        TEXT NOT NULL,
  app_slug    TEXT,
  is_temp     INTEGER NOT NULL DEFAULT 0,
  source      TEXT,
  detail      TEXT
);

CREATE INDEX IF NOT EXISTS idx_monitor_events_kind_at ON monitor_events (kind, at);

-- One row per check run. A period with no successful run is "no data", never 0.
CREATE TABLE IF NOT EXISTS monitor_runs (
  at          TEXT PRIMARY KEY,
  apps_ok     INTEGER NOT NULL DEFAULT 0,
  queries_ok  INTEGER NOT NULL DEFAULT 0,
  health_ok   INTEGER NOT NULL DEFAULT 0,
  error       TEXT
);

-- Point-in-time counts (live apps, temporary apps active, open queries), one
-- per check. Kept so "how many were live last Tuesday" has an answer.
CREATE TABLE IF NOT EXISTS monitor_gauges (
  at          TEXT NOT NULL,
  key         TEXT NOT NULL,
  value       REAL NOT NULL,
  PRIMARY KEY (at, key)
);

-- Health checks: one row per target per check.
CREATE TABLE IF NOT EXISTS monitor_health (
  at          TEXT NOT NULL,
  target      TEXT NOT NULL,
  ok          INTEGER NOT NULL,
  status      INTEGER,
  ms          INTEGER,
  error       TEXT,
  PRIMARY KEY (at, target)
);

-- Customer queries, copied from hostnsoft-api, plus the triage hostnsoft-api
-- has no field for yet: open / resolved / wont_fix.
CREATE TABLE IF NOT EXISTS monitor_queries (
  id            TEXT PRIMARY KEY,
  created_at    TEXT NOT NULL,
  type          TEXT,
  source        TEXT,
  email         TEXT,
  project_slug  TEXT,
  agent_name    TEXT,
  message       TEXT,
  status        TEXT NOT NULL DEFAULT 'open',
  resolved_at   TEXT,
  resolved_by   TEXT
);

CREATE INDEX IF NOT EXISTS idx_monitor_queries_status ON monitor_queries (status, created_at);

-- One row per alert key. Decides when an alert is sent again and when its
-- "Resolved" goes out, so the same problem never posts twice in a row.
CREATE TABLE IF NOT EXISTS monitor_alerts (
  key           TEXT PRIMARY KEY,
  rule          TEXT NOT NULL,
  level         TEXT NOT NULL,
  state         TEXT NOT NULL,
  title         TEXT NOT NULL,
  detail        TEXT,
  first_at      TEXT NOT NULL,
  last_at       TEXT NOT NULL,
  sent_at       TEXT,
  sent_level    TEXT,
  resolved_at   TEXT
);

-- Messages waiting for the scheduler to pick up. The scheduler (a viaSocket
-- flow) takes everything pending on each check and posts it to Slack.
CREATE TABLE IF NOT EXISTS monitor_outbox (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at    TEXT NOT NULL,
  kind          TEXT NOT NULL,
  channel       TEXT,
  text          TEXT NOT NULL,
  handed_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_monitor_outbox_pending ON monitor_outbox (handed_at);

-- Reports already queued, so a daily or weekly report goes out once per period.
CREATE TABLE IF NOT EXISTS monitor_sends (
  kind          TEXT NOT NULL,
  period        TEXT NOT NULL,
  at            TEXT NOT NULL,
  PRIMARY KEY (kind, period)
);

-- Settings edited on /admin/monitoring. One row; value is JSON, merged over
-- the defaults in app/lib/monitor/settings.ts.
CREATE TABLE IF NOT EXISTS monitor_settings (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  value         TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT
);

-- Who changed which setting, and when.
CREATE TABLE IF NOT EXISTS monitor_settings_audit (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  at            TEXT NOT NULL,
  by            TEXT,
  changes       TEXT NOT NULL
);
