import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// `buildCommand` must be `next build`, NOT the default `npm run build`.
// OpenNext runs this command itself to produce the standalone Next output
// (it sets NEXT_PRIVATE_STANDALONE for that child process). Leaving it at the
// default makes `npm run build` -> `opennextjs-cloudflare build` -> `npm run build`
// recurse forever on Cloudflare's builder.
export default {
  ...defineCloudflareConfig(),
  buildCommand: "next build",
};
