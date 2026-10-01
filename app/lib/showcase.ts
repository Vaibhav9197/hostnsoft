import { API_BASE } from "./api";
import { nameFromSlug, tagSlug } from "./showcaseOptions";

/**
 * Showcase reads for the public pages, from hostnsoft-api's open
 * `/public/showcase/*` endpoints (see that repo's docs/showcase.md). Read
 * server-side; no session needed. The API applies the visibility rule, so
 * nothing here has to.
 */

/* Form options live in showcaseOptions.ts (no server imports) and are
   re-exported here for the server pages. */
export {
  CATEGORIES,
  TOOLS,
  categorySlug,
  categoryFromSlug,
  nameFromSlug,
  tagSlug,
  type Category,
  type Tool,
} from "./showcaseOptions";

export interface ShowcaseApp {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string | null;
  story: string | null;
  appUrl: string;
  screenshotUrl: string | null;
  videoUrl: string | null;
  creatorName: string;
  creatorProfile: string | null;
  builtWith: string | null;
  /** The product spec the app was built from, when the creator shared one.
      Drives "Build similar app"; absent on most listings. */
  prd: string | null;
  /** Creator-supplied HTML, rendered on the app details page. */
  customHtml: string | null;
  category: string | null;
  tags: string[];
  featured: boolean;
  createdAt: string;
  /** The page this is listed under. Every listing has one. */
  collection: { slug: string; title: string; type: "public" | "event" };
}

/** An event page: /showcase/<slug>. */
export interface Collection {
  slug: string;
  title: string;
  intro: string | null;
  type: "public" | "event";
  projectCount: number;
  createdAt: string;
}

/* One fetch helper so every read fails the same way. A 404 is a normal
   answer (unknown slug), so it comes back as null; anything else is an
   error worth surfacing rather than rendering an empty gallery over. The
   pages that call this are `force-dynamic`, so no Next cache is involved. */
async function read<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Showcase read failed: ${res.status} ${path}`);
  return (await res.json()) as T;
}

/** Public apps, featured first then newest. */
/* The same live app can be listed twice — on its maker's own page and on a
   public board such as a hackathon's. Each board still shows it; the
   site-wide gallery shows it once, keeping the first listing made. */
export function uniqueByApp(apps: ShowcaseApp[]): ShowcaseApp[] {
  const first = new Map<string, ShowcaseApp>();
  for (const app of apps) {
    const key = app.appUrl.replace(/\/+$/, "").toLowerCase();
    const seen = first.get(key);
    if (!seen || app.createdAt < seen.createdAt) first.set(key, app);
  }
  const keep = new Set(first.values());
  return apps.filter((app) => keep.has(app));
}

export async function listApps(limit = 60): Promise<ShowcaseApp[]> {
  const raw = (await read<RawApp[]>(`/public/showcase?limit=${limit}`)) ?? [];
  return uniqueByApp(raw.map(withoutOwnerEmail));
}

/* The API is adding the owner's `userEmail` to app details so "Contact Dev"
   can reach them. It must never reach the browser: every public read goes
   through this, and only the contact route reads the raw record. */
type RawApp = ShowcaseApp & { userEmail?: string | null };
function withoutOwnerEmail<T extends RawApp>(app: T): ShowcaseApp {
  const { userEmail: _hidden, ...rest } = app;
  void _hidden;
  return rest;
}

export async function getApp(slug: string): Promise<ShowcaseApp | null> {
  const app = await read<RawApp>(`/public/showcase/apps/${encodeURIComponent(slug)}`);
  return app ? withoutOwnerEmail(app) : null;
}

/** Server-only: the app plus its owner's email, for the contact route. */
export async function getAppForContact(slug: string): Promise<{ app: ShowcaseApp; ownerEmail: string | null } | null> {
  const app = await read<RawApp>(`/public/showcase/apps/${encodeURIComponent(slug)}`);
  if (!app) return null;
  return { app: withoutOwnerEmail(app), ownerEmail: app.userEmail?.trim() || null };
}

/** A collection and its public apps in one round trip. */
export async function getCollectionWithApps(
  slug: string,
): Promise<{ collection: Collection; apps: ShowcaseApp[] } | null> {
  const found = await read<{ collection: Collection; projects: ShowcaseApp[] }>(
    `/public/showcase/collections/${encodeURIComponent(slug)}`,
  );
  if (!found) return null;
  return { collection: found.collection, apps: (found.projects as RawApp[]).map(withoutOwnerEmail) };
}

/* The API has no category filter yet, so this reads the whole public list
   (capped at its 200 maximum) and narrows here. Cheap at today's size; when
   the Showcase outgrows one request this moves server-side. */
export async function listAppsInCategory(category: string): Promise<ShowcaseApp[]> {
  const apps = await listApps(200);
  return apps.filter((app) => app.category === category);
}

/* Tags are free text, so there is no fixed list to validate a slug against.
   The display name is the spelling the most apps used, so "Education" wins
   over "education" if that is how creators wrote it. A tag no app carries
   still resolves, with an empty list and a name derived from the slug, so the
   page can show "no apps yet" instead of a 404. */
export async function listAppsWithTag(slug: string): Promise<{ tag: string; apps: ShowcaseApp[] }> {
  const apps = (await listApps(200)).filter((app) => app.tags.some((t) => tagSlug(t) === slug));
  if (apps.length === 0) return { tag: nameFromSlug(slug), apps };
  const spellings = new Map<string, number>();
  for (const app of apps) {
    for (const t of app.tags) {
      if (tagSlug(t) === slug) spellings.set(t, (spellings.get(t) ?? 0) + 1);
    }
  }
  const tag = [...spellings.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return { tag, apps };
}
