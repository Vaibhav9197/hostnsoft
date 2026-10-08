import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // "Company" became "workspace" in the panel; keep old links working.
      { source: "/app/switch-company", destination: "/app/switch-workspace", permanent: true },
      // www.embarko.ai is bound to the same Worker as embarko.ai (see the
      // routes in wrangler.jsonc), so without this it serves a second full
      // copy of the site. Every page already names the apex host as its
      // canonical, but Search Console still reported the www copies as
      // "Duplicate without user-selected canonical" — a redirect is the signal
      // Google actually acts on. Apex is the canonical host: it is what SITE in
      // app/lib/site.ts, the sitemap and robots.txt all say.
      // Two rules, not one `/:path*`: on the bare root the empty match was
      // emitted literally, sending www.embarko.ai/ to embarko.ai/:path*.
      {
        source: "/",
        has: [{ type: "host", value: "www.embarko.ai" }],
        destination: "https://embarko.ai/",
        permanent: true,
      },
      {
        source: "/:path+",
        has: [{ type: "host", value: "www.embarko.ai" }],
        destination: "https://embarko.ai/:path+",
        permanent: true,
      },

      // The docs used to live at /doc. The deploy prompt, llms.txt and older
      // shared links all point at the singular form, so keep it working.
      { source: "/doc", destination: "/docs", permanent: true },

      // Troubleshooting and limitations moved under /docs. The old addresses
      // are not just in shared links — the capabilities manifest the deploy
      // host serves to agents names /troubleshoot, and so does the deploy
      // script already installed on people's machines, which prints it in the
      // error output of a failed deploy. Neither can be recalled, and the
      // second one is read at exactly the moment somebody is stuck.
      { source: "/troubleshoot", destination: "/docs/troubleshoot", permanent: true },
      {
        source: "/limitations-and-recommendations",
        destination: "/docs/limitations",
        permanent: true,
      },

      // /docs was the original single-page manual. Once the docs were split
      // into layered pages it was ~70% duplicate of /docs/api and
      // /docs/overview, and two copies of the same fact drift — which is
      // exactly what happened to /deploy-troubleshooting.md below. Its
      // unique content moved into overview (where apps run) and
      // capabilities (the /capabilities manifest), and the page is gone.
      //
      // Both spellings redirect, to different places on purpose: a human on
      // /docs wants the landing page, while /docs/docs.md is what the copy
      // prompt and older pasted prompts tell an AGENT to fetch, and an agent
      // that asked for the full reference should land on the API contract,
      // not the conceptual overview.
      { source: "/docs", destination: "/docs/overview", permanent: true },
      { source: "/docs/docs.md", destination: "/docs/api.md", permanent: true },

      // /deploy-troubleshooting.md was a second, hand-maintained copy of the
      // troubleshooting reference, served as a static file from public/ and
      // linked from nothing in this repo. It had drifted: it still told
      // agents to raise memory with `PATCH .../memory`, which is not a thing
      // you can do, and named the pre-deploymentId rollback path. Every entry
      // it had exists in content/docs/troubleshoot.md in a better form.
      // Redirected rather than dropped because it was publicly reachable for
      // months and an agent may hold the URL.
      {
        source: "/deploy-troubleshooting.md",
        destination: "/docs/troubleshoot.md",
        permanent: true,
      },

      // public/skills/ was a generated copy of the skill repo, kept in sync by
      // git hooks, and linked from nothing live. The skill repo is now the only
      // copy. The deploy script goes to its raw file so a `curl` still gets a
      // script; everything else goes to the repo.
      {
        source: "/skills/embarko-deploy.sh",
        destination: "https://raw.githubusercontent.com/embarko-ai/skill/main/scripts/deploy.sh",
        permanent: true,
      },
      { source: "/skills/:path*", destination: "https://github.com/embarko-ai/skill", permanent: true },
    ];
  },

  /* The published docs live in this repo as markdown under content/docs/ and
     are imported as raw strings. They can't be read off disk at request time:
     production is a Cloudflare Worker via OpenNext, which has no filesystem.
     Bundling them as source means the markdown ships inside the build and
     rendering a doc costs no IO at all.

     `next dev` and `opennextjs-cloudflare build` both run webpack, so this one
     rule covers development and production. */
  webpack(config) {
    config.module.rules.push({ test: /\.md$/, type: "asset/source" });
    return config;
  },
};

/* Loads the workerd runtime into `next dev` so getCloudflareContext() can hand
   out the D1 binding locally. This was deliberately left out while the app used
   no bindings at all — that stopped being true when the A/B store moved to D1,
   and without it every /api/events and /api/metrics request fails in dev.
   Running dev on the same binding as production is also what would have caught
   the better-sqlite3 problem before it shipped.

   Guarded on NODE_ENV because `next build` evaluates this file too. DB_ADMIN is
   `remote: true`, so an unguarded call makes the build open a live connection to
   production D1 — fine locally where wrangler is logged in, fatal in Cloudflare's
   build sandbox, which has no credentials and hangs on "Establishing remote
   connection..." until the 30-minute timeout. A build must not need the database
   it is being built to talk to. */
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
