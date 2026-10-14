import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/* Pages of the docs the agent guide replaced, and the guide topic each one's
   content moved to ("" is the guide's contents page). */
const OLD_DOCS = [
  ["overview", "prerequisites"],
  ["agent-quickstart", "quickstart"],
  ["agent-playbook", "quickstart"],
  ["escalation", "prerequisites"],
  ["capabilities", ""],
  ["api", ""],
  ["troubleshoot", "errors"],
  ["limitations", "prerequisites"],
  ["limitations-and-recommendations", "prerequisites"],
];

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
      { source: "/troubleshoot", destination: "/docs/errors", permanent: true },
      { source: "/limitations-and-recommendations", destination: "/docs/prerequisites", permanent: true },

      // /docs is now the agent guide (app/lib/guide): one topic per page, in
      // the order an agent meets them. Every page of the docs it replaced
      // redirects to the topic that took its place, in both spellings — the
      // page and its .md, which is what agents and old deploy prompts fetch.
      // An unlisted .md would otherwise fall through to the guide's 404.
      ...OLD_DOCS.flatMap(([from, to]) => [
        { source: `/docs/${from}`, destination: to ? `/docs/${to}` : "/docs", permanent: true },
        { source: `/docs/${from}.md`, destination: `/docs/${to || "index"}.md`, permanent: true },
      ]),
      // The repo-shaped path, the first thing anyone guesses for a doc's source.
      { source: "/content/docs/:file", destination: "/docs/:file", permanent: true },
      // /docs/docs.md is what older pasted prompts tell an agent to fetch.
      { source: "/docs/docs.md", destination: "/docs/index.md", permanent: true },

      // /deploy-troubleshooting.md was a second, hand-maintained copy of the
      // troubleshooting reference, served from public/. Redirected rather
      // than dropped because it was publicly reachable for months and an
      // agent may hold the URL.
      { source: "/deploy-troubleshooting.md", destination: "/docs/errors.md", permanent: true },

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

  /* content/docs/hackathons.md is imported as a raw string. It can't be read
     off disk at request time: production is a Cloudflare Worker via OpenNext,
     which has no filesystem. Bundling it as source means the markdown ships
     inside the build and rendering it costs no IO at all.

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
