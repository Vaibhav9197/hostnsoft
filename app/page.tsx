/* `/` is normally rewritten to one of the landing-page variants by
   middleware.ts, so this module only renders if middleware never ran (a build
   without it, or local tooling that bypasses it). Re-exporting v3 — the
   long-standing landing page — keeps `/` from 404ing in that case rather than
   duplicating a fourth copy of the page here. */
export { default } from "./v3/page";
