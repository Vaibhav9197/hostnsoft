import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// Embarko only persists what an app writes underneath DATA_DIR — everything
// else lives in the container filesystem and is wiped on the next deploy. So
// the A/B store follows DATA_DIR when the platform sets it, and falls back to
// the ./.data folder this project has always used for local dev (where the
// variable doesn't exist). See https://embarko.ai/doc#storage-requirements.
const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "hero-ab.sqlite");

let db: Database.Database | undefined;

// A fresh deploy starts with an empty DATA_DIR, so the schema has to be created
// on demand — otherwise the first request dies on "no such table". Every
// statement is IF NOT EXISTS, which makes this a no-op against the existing
// local database.
function migrate(handle: Database.Database) {
  handle.exec(`
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
  `);
}

export function getDb(): Database.Database {
  if (!db) {
    // DATA_DIR is mounted by the platform, but the local fallback may not exist
    // yet on a clean checkout, and better-sqlite3 will not create it for us.
    fs.mkdirSync(DATA_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    migrate(db);
  }
  return db;
}
