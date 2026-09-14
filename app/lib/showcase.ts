import { getDb } from "./db";

/**
 * Showcase reads and writes.
 *
 * Everything public goes through a status filter. `status` is the only thing
 * standing between an open submission form and the front page, so it is applied
 * here rather than left to each caller to remember — a listing that forgets it
 * publishes spam.
 */

export const CATEGORIES = [
  "AI Tool",
  "Personal",
  "Business",
  "Productivity",
  "Education",
  "Game",
  "Developer Tool",
  "Other",
] as const;

export const TOOLS = ["Claude", "Codex", "Cursor", "Lovable", "Replit", "Other"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Tool = (typeof TOOLS)[number];

export interface ShowcaseApp {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  whatItDoes: string | null;
  whyBuilt: string | null;
  appUrl: string;
  customUrl: string | null;
  screenshotUrl: string | null;
  videoUrl: string | null;
  creatorName: string;
  creatorProfile: string | null;
  builtWith: string | null;
  category: string | null;
  organisation: string | null;
  hackathonCode: string | null;
  featured: boolean;
  createdAt: string;
  tags: string[];
}

export interface Collection {
  path: string;
  kind: string;
  title: string;
  intro: string | null;
  matchValue: string | null;
  indexable: boolean;
}

/* D1 hands back whatever the columns are named; this is the one place that
   shape is turned into the camelCase one the pages use. */
interface AppRow {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  what_it_does: string | null;
  why_built: string | null;
  app_url: string;
  custom_url: string | null;
  screenshot_url: string | null;
  video_url: string | null;
  creator_name: string;
  creator_profile: string | null;
  built_with: string | null;
  category: string | null;
  organisation: string | null;
  hackathon_code: string | null;
  featured: number;
  created_at: string;
}

function toApp(row: AppRow, tags: string[] = []): ShowcaseApp {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    whatItDoes: row.what_it_does,
    whyBuilt: row.why_built,
    appUrl: row.app_url,
    customUrl: row.custom_url,
    screenshotUrl: row.screenshot_url,
    videoUrl: row.video_url,
    creatorName: row.creator_name,
    creatorProfile: row.creator_profile,
    builtWith: row.built_with,
    category: row.category,
    organisation: row.organisation,
    hackathonCode: row.hackathon_code,
    featured: row.featured === 1,
    createdAt: row.created_at,
  tags,
  };
}

const PUBLIC_COLUMNS = `
  id, slug, name, tagline, what_it_does, why_built, app_url, custom_url,
  screenshot_url, video_url, creator_name, creator_profile, built_with,
  category, organisation, hackathon_code, featured, created_at
`;

/* Featured first, then newest. Ordering lives in one constant because the
   front page, the collections and the app page all have to agree on what
   "first" means — a project that is featured on one listing and buried on
   another reads as a bug. */
const PUBLIC_ORDER = "ORDER BY featured DESC, created_at DESC";

/** Approved apps, newest first, featured ahead of the rest. */
export async function listApps(limit = 60): Promise<ShowcaseApp[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT ${PUBLIC_COLUMNS} FROM showcase_apps WHERE status = 'approved' ${PUBLIC_ORDER} LIMIT ?`,
    )
    .bind(limit)
    .all<AppRow>();
  return withTags(results ?? []);
}

export async function getApp(slug: string): Promise<ShowcaseApp | null> {
  const row = await getDb()
    .prepare(`SELECT ${PUBLIC_COLUMNS} FROM showcase_apps WHERE slug = ? AND status = 'approved'`)
    .bind(slug)
    .first<AppRow>();
  if (!row) return null;
  const [withTag] = await withTags([row]);
  return withTag ?? null;
}

/**
 * Attach tags in one extra query rather than one per app.
 *
 * A join would duplicate every app row once per tag and leave the caller to
 * regroup them; with at most a handful of tags each, two round trips is both
 * simpler and cheaper than that.
 */
async function withTags(rows: AppRow[]): Promise<ShowcaseApp[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(",");
  const { results } = await getDb()
    .prepare(`SELECT app_id, tag FROM showcase_tags WHERE app_id IN (${placeholders})`)
    .bind(...ids)
    .all<{ app_id: string; tag: string }>();

  const byApp = new Map<string, string[]>();
  for (const { app_id, tag } of results ?? []) {
    const list = byApp.get(app_id);
    if (list) list.push(tag);
    else byApp.set(app_id, [tag]);
  }
  return rows.map((r) => toApp(r, byApp.get(r.id) ?? []));
}

export async function getCollection(path: string): Promise<Collection | null> {
  const row = await getDb()
    .prepare(
      `SELECT path, kind, title, intro, match_value, indexable FROM showcase_collections WHERE path = ?`,
    )
    .bind(path)
    .first<{
      path: string;
      kind: string;
      title: string;
      intro: string | null;
      match_value: string | null;
      indexable: number;
    }>();
  if (!row) return null;
  return {
    path: row.path,
    kind: row.kind,
    title: row.title,
    intro: row.intro,
    matchValue: row.match_value,
    indexable: row.indexable === 1,
  };
}

/* Which column a collection's match_value is compared against. A kind that
   isn't listed here has no rule, so its membership is whatever
   showcase_collection_apps says and nothing more. */
const MATCH_COLUMN: Record<string, string> = {
  category: "category",
  "ai-tool": "built_with",
  hackathon: "hackathon_code",
  college: "organisation",
};

/**
 * The apps on a collection page: everything the collection's rule matches, plus
 * anything added to it by hand.
 *
 * The two are unioned rather than checked in sequence because an app can
 * satisfy both — a hackathon project that was also curated in — and it should
 * appear once either way.
 */
export async function listCollectionApps(collection: Collection): Promise<ShowcaseApp[]> {
  const column = MATCH_COLUMN[collection.kind];
  const rule =
    column && collection.matchValue
      ? `OR a.${column} = ?`
      : "";

  const binds: string[] = [collection.path];
  if (rule) binds.push(collection.matchValue!);

  const { results } = await getDb()
    .prepare(
      `SELECT ${PUBLIC_COLUMNS.split(",").map((c) => `a.${c.trim()}`).join(", ")}
         FROM showcase_apps a
         LEFT JOIN showcase_collection_apps ca
           ON ca.app_id = a.id AND ca.collection_path = ?
        WHERE a.status = 'approved' AND (ca.app_id IS NOT NULL ${rule})
        ${PUBLIC_ORDER.replace("featured", "a.featured").replace("created_at", "a.created_at")}`,
    )
    .bind(...binds)
    .all<AppRow>();

  return withTags(results ?? []);
}

/** Collections worth linking to, for the discover rail. */
export async function listIndexableCollections(): Promise<Collection[]> {
  const { results } = await getDb()
    .prepare(
      `SELECT path, kind, title, intro, match_value, indexable
         FROM showcase_collections WHERE indexable = 1 ORDER BY title`,
    )
    .all<{
      path: string;
      kind: string;
      title: string;
      intro: string | null;
      match_value: string | null;
      indexable: number;
    }>();
  return (results ?? []).map((r) => ({
    path: r.path,
    kind: r.kind,
    title: r.title,
    intro: r.intro,
    matchValue: r.match_value,
    indexable: true,
  }));
}

/* ------------------------------------------------------------------ writes */

export interface Submission {
  name: string;
  tagline: string;
  appUrl: string;
  whatItDoes?: string | null;
  whyBuilt?: string | null;
  creatorName: string;
  creatorProfile?: string | null;
  builtWith?: string | null;
  category?: string | null;
  tags?: string[];
  hackathonCode?: string | null;
  videoUrl?: string | null;
  screenshotUrl?: string | null;
}

/**
 * Record a submission. Always lands as 'pending' — approval is a separate,
 * human act, and nothing here can shortcut it.
 */
export async function createSubmission(input: Submission): Promise<{ slug: string }> {
  const db = getDb();
  const id = crypto.randomUUID();
  const slug = await uniqueSlug(input.name);

  await db
    .prepare(
      `INSERT INTO showcase_apps
         (id, slug, name, tagline, what_it_does, why_built, app_url, screenshot_url,
          video_url, creator_name, creator_profile, built_with, category,
          hackathon_code, status, pro_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .bind(
      id,
      slug,
      input.name,
      input.tagline,
      input.whatItDoes ?? null,
      input.whyBuilt ?? null,
      input.appUrl,
      input.screenshotUrl ?? null,
      input.videoUrl ?? null,
      input.creatorName,
      input.creatorProfile ?? null,
      input.builtWith ?? null,
      input.category ?? null,
      input.hackathonCode ?? null,
      /* Only a submission that actually carried a video is awaiting a decision
         on the Pro offer; the rest have nothing to review. */
      input.videoUrl ? "requested" : null,
    )
    .run();

  const tags = normalizeTags(input.tags ?? []);
  if (tags.length > 0) {
    await db.batch(
      tags.map((tag) =>
        db.prepare(`INSERT OR IGNORE INTO showcase_tags (app_id, tag) VALUES (?, ?)`).bind(id, tag),
      ),
    );
  }

  return { slug };
}

/**
 * Tags are normalized on the way in, not on the way out: "College", "college "
 * and "COLLEGE" are one tag, and deciding that at read time would mean every
 * listing re-deriving it.
 */
export function normalizeTags(raw: string[]): string[] {
  const seen = new Set<string>();
  for (const value of raw) {
    const tag = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    if (tag) seen.add(tag);
  }
  return [...seen].slice(0, 8);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

/**
 * A slug that isn't taken yet.
 *
 * Two people submitting "Trip Planner" is ordinary, not an error, so the second
 * one gets a suffix rather than a rejection. The column is UNIQUE, so a race
 * between two identical names still fails loudly at the insert instead of
 * silently overwriting.
 */
async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "app";
  const { results } = await getDb()
    .prepare(`SELECT slug FROM showcase_apps WHERE slug = ? OR slug LIKE ?`)
    .bind(base, `${base}-%`)
    .all<{ slug: string }>();

  const taken = new Set((results ?? []).map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}
