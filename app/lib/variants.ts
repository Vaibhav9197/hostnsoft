/**
 * The landing-page split test's arms, and the route each one renders.
 *
 * Shared rather than owned by middleware.ts because the client needs the same
 * table: middleware maps arm → route to decide what `/` serves, and the deploy
 * prompt maps route → arm to work out which page a visitor is copying from.
 * Two copies of this would drift, and the drift would be silent — it would only
 * show up as mis-attributed deploys weeks later.
 *
 * Keep this module free of anything runtime-specific. It is imported by the
 * edge middleware and by client components alike.
 */
export const VARIANTS = {
  alpha: "/v1",
  beta: "/v2",
  gamma: "/v3",
  delta: "/v4",
} as const;

export type Variant = keyof typeof VARIANTS;

export const VARIANT_NAMES = Object.keys(VARIANTS) as Variant[];

export function isVariant(value: string | null | undefined): value is Variant {
  return VARIANT_NAMES.includes(value as Variant);
}

/**
 * Which arm does this path render, if any?
 *
 * Only a direct hit on /v1../v4 answers. A bucketed visitor sees `/` — the
 * rewrite is invisible to the browser — so the path says nothing and the
 * cookie is the only source. Returns null for every other page, /doc included.
 */
export function variantForPath(pathname: string): Variant | null {
  return VARIANT_NAMES.find((name) => VARIANTS[name] === pathname) ?? null;
}
