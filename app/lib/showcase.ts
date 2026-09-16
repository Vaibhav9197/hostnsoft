import { API_BASE } from "./api";

/**
 * Showcase reads for the public pages, from hostnsoft-api's open
 * `/public/showcase/*` endpoints (see that repo's docs/showcase.md). Read
 * server-side; no session needed. The API applies the visibility rule, so
 * nothing here has to.
 */

/* Form options live in showcaseOptions.ts (no server imports) and are
   re-exported here for the server pages. */
export { CATEGORIES, TOOLS, type Category, type Tool } from "./showcaseOptions";

export interface ShowcaseApp {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  whatItDoes: string | null;
  whyBuilt: string | null;
  appUrl: string;
  screenshotUrl: string | null;
  videoUrl: string | null;
  creatorName: string;
  creatorProfile: string | null;
  builtWith: string | null;
  category: string | null;
  tags: string[];
  featured: boolean;
  createdAt: string;
  /** The page this is listed under. Every listing has one. */
  collection: { slug: string; title: string; type: "company" | "public" };
}

/** A showcase page: /showcase/<slug>. A company's own, or a public board. */
export interface Collection {
  slug: string;
  title: string;
  intro: string | null;
  type: "company" | "public";
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
export async function listApps(limit = 60): Promise<ShowcaseApp[]> {
  return (await read<ShowcaseApp[]>(`/public/showcase?limit=${limit}`)) ?? [];
}

export async function getApp(slug: string): Promise<ShowcaseApp | null> {
  return read<ShowcaseApp>(`/public/showcase/apps/${encodeURIComponent(slug)}`);
}

/** A collection and its public apps in one round trip. */
export async function getCollectionWithApps(
  slug: string,
): Promise<{ collection: Collection; apps: ShowcaseApp[] } | null> {
  const found = await read<{ collection: Collection; projects: ShowcaseApp[] }>(
    `/public/showcase/collections/${encodeURIComponent(slug)}`,
  );
  if (!found) return null;
  return { collection: found.collection, apps: found.projects };
}

/** Collections worth linking to from the gallery — only those with at least
 *  one public app, so the discover rail never points at an empty page. */
export async function listIndexableCollections(): Promise<Collection[]> {
  return (await read<Collection[]>("/public/showcase/collections")) ?? [];
}
