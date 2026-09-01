/*
  Local-only persistence for the hero A/B test.

  Production deploys to Cloudflare Workers (see @opennextjs/cloudflare), where
  `node:sqlite` does not exist. So this module:

    - only ever touches SQLite when running locally (NODE_ENV !== production),
    - imports every Node built-in dynamically with a webpackIgnore hint, so the
      Worker bundle never tries to resolve them,
    - degrades to console logging everywhere else.

  Swap `recordHeroEvent` for a hosted database (D1, Postgres, …) when the test
  needs to run in production.
*/

export type HeroEventRow = {
  visitorId: string;
  variant: string;
  event: string;
  url: string | null;
  userAgent: string | null;
};

export type HeroVariantStats = {
  variant: string;
  visitors: number;
  impressions: number;
  ctaClicks: number;
  ctr: number;
};

const DB_RELATIVE_PATH = ".data/hero-ab.sqlite";

/** SQLite is for local development only; see the module comment. */
function isLocalStoreEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

/* The dev server re-evaluates modules on hot reload, which would otherwise leak
   a new database handle each time. */
const globalForDb = globalThis as typeof globalThis & {
  __heroDb?: HeroDatabase | null;
};

type HeroDatabase = {
  prepare(sql: string): {
    run(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
  exec(sql: string): void;
};

async function getDb(): Promise<HeroDatabase | null> {
  if (!isLocalStoreEnabled()) return null;
  if (globalForDb.__heroDb !== undefined) return globalForDb.__heroDb;

  try {
    const [{ DatabaseSync }, fs, path] = await Promise.all([
      import(/* webpackIgnore: true */ "node:sqlite"),
      import(/* webpackIgnore: true */ "node:fs"),
      import(/* webpackIgnore: true */ "node:path"),
    ]);

    const file = path.join(process.cwd(), DB_RELATIVE_PATH);
    fs.mkdirSync(path.dirname(file), { recursive: true });

    const db = new DatabaseSync(file) as unknown as HeroDatabase;

    db.exec(`
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
    `);

    globalForDb.__heroDb = db;
    return db;
  } catch (error) {
    // Older Node without node:sqlite, a read-only FS, etc. Never fatal.
    console.warn("[Hero A/B] SQLite unavailable, falling back to logs:", error);
    globalForDb.__heroDb = null;
    return null;
  }
}

export async function recordHeroEvent(row: HeroEventRow): Promise<void> {
  const db = await getDb();

  if (!db) {
    console.log("[Hero A/B]", row);
    return;
  }

  // First impression per visitor establishes their assignment.
  db.prepare(
    `INSERT INTO hero_assignments (visitor_id, variant)
     VALUES (?, ?)
     ON CONFLICT(visitor_id) DO NOTHING`
  ).run(row.visitorId, row.variant);

  db.prepare(
    `INSERT INTO hero_events (visitor_id, variant, event, url, user_agent)
     VALUES (?, ?, ?, ?, ?)`
  ).run(row.visitorId, row.variant, row.event, row.url, row.userAgent);
}

export async function readHeroStats(): Promise<HeroVariantStats[] | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = db
    .prepare(
      `SELECT variant,
              COUNT(DISTINCT visitor_id)                                  AS visitors,
              SUM(CASE WHEN event = 'hero_impression' THEN 1 ELSE 0 END)  AS impressions,
              SUM(CASE WHEN event = 'hero_cta_click'  THEN 1 ELSE 0 END)  AS cta_clicks
       FROM hero_events
       GROUP BY variant
       ORDER BY variant`
    )
    .all() as Array<{
      variant: string;
      visitors: number;
      impressions: number;
      cta_clicks: number;
    }>;

  return rows.map((r) => ({
    variant: r.variant,
    visitors: r.visitors,
    impressions: r.impressions,
    ctaClicks: r.cta_clicks,
    ctr: r.impressions > 0 ? Number(((r.cta_clicks / r.impressions) * 100).toFixed(2)) : 0,
  }));
}
