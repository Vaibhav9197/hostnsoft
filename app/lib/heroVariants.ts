/*
  Shared A/B test constants.

  Imported by middleware (edge), server components, route handlers and client
  code, so this file must stay free of runtime-specific APIs.
*/

export type HeroVariant = "A" | "B" | "C" | "D";

export const HERO_VARIANTS: readonly HeroVariant[] = ["A", "B", "C", "D"];

export const HERO_VARIANT_COOKIE = "hero_variant";
export const HERO_VISITOR_COOKIE = "hero_vid";

/** Middleware forwards the resolved values on these request headers so the
 *  first server render sees them, before the Set-Cookie has round-tripped. */
export const HERO_VARIANT_HEADER = "x-hero-variant";
export const HERO_VISITOR_HEADER = "x-hero-vid";

export const HERO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function isHeroVariant(value: unknown): value is HeroVariant {
  return typeof value === "string" && HERO_VARIANTS.includes(value as HeroVariant);
}

/** Equal 25% split across the four variants. */
export function pickHeroVariant(): HeroVariant {
  return HERO_VARIANTS[Math.floor(Math.random() * HERO_VARIANTS.length)];
}
