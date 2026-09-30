import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// `buildCommand` must be `next build`, NOT the default `npm run build`.
// OpenNext runs this command itself to produce the standalone Next output
// (it sets NEXT_PRIVATE_STANDALONE for that child process). Leaving it at the
// default makes `npm run build` -> `opennextjs-cloudflare build` -> `npm run build`
// recurse forever on Cloudflare's builder.
//
// Incremental cache: without one, every prerendered page (the landing pages,
// docs, the /app shell) was rendered again on every request — x-nextjs-cache:
// MISS every time, and 115–800ms before the first byte. The static-assets cache
// serves the HTML `next build` already produced, straight from the Worker's own
// assets, with no KV/R2 binding to set up. It is read-only, which is only safe
// because nothing here revalidates: no `revalidate`, `revalidateTag` or
// `use cache` anywhere in the app. Adding any of those needs a writable cache
// (R2 or KV) instead — with this one they would silently never refresh.
//
// Cache interception answers those pages before the Next server is even
// loaded. It runs after middleware, so the landing-page A/B rewrite and its
// cookie still apply to cached responses.
export default {
  ...defineCloudflareConfig({
    incrementalCache: staticAssetsIncrementalCache,
    enableCacheInterception: true,
  }),
  buildCommand: "next build",
};
