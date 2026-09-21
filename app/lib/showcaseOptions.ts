/**
 * The choices the Showcase submission form offers.
 *
 * Kept apart from lib/showcase.ts on purpose: that module reads hostnsoft-api
 * server-side and drags in next/headers through lib/api.ts, which a client
 * component (the form) can't import. This file has no imports at all.
 *
 * Mirrors SHOWCASE_CATEGORIES / SHOWCASE_TOOLS in hostnsoft-api
 * (src/services/showcase.ts) — the API drops anything not on its list.
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

/** URL segment for a category or tag page: "AI Tool" → "ai-tool". */
export function showcaseSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const categorySlug = showcaseSlug;
export const tagSlug = showcaseSlug;

/** The category a URL segment names, or null when it isn't one we know. */
export function categoryFromSlug(slug: string): Category | null {
  return CATEGORIES.find((c) => categorySlug(c) === slug) ?? null;
}
