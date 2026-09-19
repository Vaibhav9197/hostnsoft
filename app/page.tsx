import { LANDING_METADATA } from "./lib/landingMetadata";

/* `/` is normally rewritten to one of the landing-page variants by
   middleware.ts, so this module only renders if middleware never ran (a build
   without it, or local tooling that bypasses it). Re-exporting v3 — the
   long-standing landing page — keeps `/` from 404ing in that case rather than
   duplicating a fourth copy of the page here.

   Re-exporting v3/page does NOT pull in v3/layout — Next resolves metadata
   from the layout at the route being rendered (this one, under the root
   layout), not from the module a page happens to import its default export
   from. Without this, the no-middleware fallback would serve v3's content
   under the root layout's generic title instead of the homepage's. */
export const metadata = LANDING_METADATA;

export { default } from "./v3/page";
