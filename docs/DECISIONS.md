---
covers: ["*"]
verified_at: 105ccbb
verified_on: 2026-10-23
---
# Architectural & Design Decisions (ADRs)

Why this repo is the way it is. Every entry cites the commit that made the
choice; most of the reasoning also lives in long comments at the cited file.
Read the comment before changing the code it guards.

Status key: **Active** — in force at `105ccbb`. **Superseded** — replaced by a
later ADR, kept so nobody reintroduces the old approach.

## Decision Index

| Date | Decision | Status | Area |
|---|---|---|---|
| 2026-09-11 | [ADR-001: A/B store on D1, not better-sqlite3](#adr-001-ab-store-on-d1-not-better-sqlite3) | Active | Data |
| 2026-09-11 | [ADR-002: Two D1 bindings, one database](#adr-002-two-d1-bindings-one-database) | Active | Data / Dev |
| 2026-09-12 | [ADR-003: Dev-only Cloudflare hook guarded on NODE_ENV](#adr-003-dev-only-cloudflare-hook-guarded-on-node_env) | Active | Build |
| 2026-09-03 | [ADR-004: OpenNext builds Next itself](#adr-004-opennext-builds-next-itself) | Active | Build |
| 2026-09-30 | [ADR-005: worker.ts answers /api/hns before Next boots](#adr-005-workerts-answers-apihns-before-next-boots) | Active | Runtime |
| 2026-09-30 | [ADR-006: Read-only static-assets cache; no revalidation](#adr-006-read-only-static-assets-cache-no-revalidation) | Active | Runtime |
| 2026-09-05 | [ADR-007: BFF proxy; the MSG91 PAT is the session](#adr-007-bff-proxy-the-msg91-pat-is-the-session) | Active | Auth |
| 2026-09-30 | [ADR-008: 5s reads, 10s writes, 120s uploads](#adr-008-5s-reads-10s-writes-120s-uploads) | Active | Auth / API |
| 2026-09-05 | [ADR-009: GTM id pinned in code](#adr-009-gtm-id-pinned-in-code) | Active | Analytics |
| 2026-09-04 | [ADR-010: Landing A/B by middleware rewrite](#adr-010-landing-ab-by-middleware-rewrite) | Active | Marketing |
| 2026-09-15 | [ADR-011: One deploy prompt, two lines, raw .md URL](#adr-011-one-deploy-prompt-two-lines-raw-md-url) | Active | Product |
| 2026-09-16 | [ADR-012: Console prompts require a token; marketing stays anonymous](#adr-012-console-prompts-require-a-token-marketing-stays-anonymous) | Active | Product |
| 2026-09-17 | [ADR-013: Browser upload packs natively, 100 MB cap](#adr-013-browser-upload-packs-natively-100-mb-cap) | Active | Console |
| 2026-10-14 | [ADR-014: /docs is the generated agent guide](#adr-014-docs-is-the-generated-agent-guide) | Active | Docs |
| 2026-10-09 | [ADR-015: Live PRD — committed vs generated layers](#adr-015-live-prd--committed-vs-generated-layers) | Active | Docs / Admin |
| 2026-09-17 | [ADR-016: Static OG image, static sitemap, apex canonical](#adr-016-static-og-image-static-sitemap-apex-canonical) | Active | SEO |
| 2026-09-28 | [ADR-017: One design system, no gradients, flat buttons](#adr-017-one-design-system-no-gradients-flat-buttons) | Active | Design |
| 2026-09-22 | [ADR-018: Follow the OS theme; no in-app picker](#adr-018-follow-the-os-theme-no-in-app-picker) | Active | Console |
| 2026-09-28 | [ADR-019: Panel UX — "Your apps", no "New app", tokens out of the header](#adr-019-panel-ux--your-apps-no-new-app-tokens-out-of-the-header) | Active | Console |
| 2026-09-25 | [ADR-020: Hostnames in one module](#adr-020-hostnames-in-one-module) | Active | Config |
| 2026-09-14 | [ADR-021: D1-backed pages are force-dynamic](#adr-021-d1-backed-pages-are-force-dynamic) | Active | Runtime |

---

## ADR-001: A/B store on D1, not better-sqlite3

**Status:** Active.

**Context.** The landing split test wrote to a better-sqlite3 file under `DATA_DIR`. Production is a Cloudflare Worker: workerd cannot load a native addon and has no writable filesystem. Every write threw; `POST /api/events` answered 500 in production and 200 on localhost, so the dashboard showed "no traffic" for weeks.

**Decision.** `app/lib/db.ts:getDb` returns the D1 binding `DB`; the schema lives in `migrations/0001_init.sql`, not in a migrate-on-first-use call (a Worker has nothing to lose between deploys, and per-request migration costs a round trip). A missing binding throws loudly.

**Evidence.** `ed4d929` (move to D1), `533c7a9` (database had been created on the wrong Cloudflare account — binding resolved to nothing), `migrations/0002_event_data.sql` (events keep their payload in a JSON column so the dashboard aggregates `hero_events` directly).

**Consequences.** Everything is async. New tables need a migration applied to the remote D1 by hand (see `f160b9b`: "Needs migrations/0004_feature_votes.sql applied to the remote D1"). Bindings are typed by the committed `cloudflare.d.ts`, not cf-typegen output.

**Rejected.** `variant_metrics` running totals — dropped in `1b0c07f` because two tallies of one thing drift and counters discard who/when/where. pglite — removed `cd853f4`. <!-- verify:ignore -->

## ADR-002: Two D1 bindings, one database

**Status:** Active.

**Context.** The admin dashboard on localhost showed whatever rows the laptop held, which answers no question anyone has.

**Decision.** `wrangler.jsonc` binds the same database twice: `DB` (local in `next dev`) for writes, `DB_ADMIN` (`remote: true`) for admin reads via `app/lib/db.ts:getAdminDb`. Deployed, they are one database. `getAdminDb` falls back to `DB` so an older checkout still shows a dashboard.

**Evidence.** `c08b790`, verified by writing three page views from localhost and watching production stay still.

**Consequences.** A CTA clicked on localhost lands in the local DB; the dashboard will not move. Writes must never use `DB_ADMIN` or local browsing invents production traffic. The Live PRD's `app/lib/system/catalogue.ts` only ever runs SELECT/PRAGMA on `DB_ADMIN`.

## ADR-003: Dev-only Cloudflare hook guarded on NODE_ENV

**Status:** Active (re-applied after a revert).

**Context.** `next build` evaluates `next.config.mjs`. An unguarded `initOpenNextCloudflareForDev()` opens the wrangler platform proxy during the build; with `DB_ADMIN` remote, that is a live connection to production D1 — fine locally, fatal in Cloudflare's build sandbox, which hung on "Establishing remote connection..." until the 30-minute timeout. Every push after ADR-002 failed this way while the build itself was healthy.

**Decision.** `next.config.mjs` calls the hook only when `NODE_ENV === "development"`. Rule: a build must not need the database it is being built to talk to.

**Evidence.** `b740d21` (guard), `01ac604` (reverted at Ashish's request — no rationale recorded), `8804a9a` (re-applied, same day the next build failed).

**Rejected.** Leaving the hook out entirely — that was the original state and is why ADR-001's bug survived: dev and production disagreed about what the database was.

## ADR-004: OpenNext builds Next itself

**Status:** Active.

**Context.** OpenNext's default `buildCommand` is `npm run build`; with `opennextjs-cloudflare build` inside that same script, Cloudflare's builder recursed forever (five fix commits on 2026-09-03).

**Decision.** `open-next.config.ts` sets `buildCommand: "next build"`; `package.json` `build` is just `opennextjs-cloudflare build`. `--skipNextBuild` was not an option: no `output: "standalone"`, and OpenNext only sets `NEXT_PRIVATE_STANDALONE` when it runs the build itself.

**Evidence.** `9f83230` (final), `6b21036`, `80c5e82`, `c9cf29b`. `bec2534` added `--dangerouslyUseUnsupportedNextVersion` — no rationale in the commit.

> [!TODO]
> `bec2534`: why the installed Next version is unsupported by the adapter, and what the upgrade plan is, is not recorded.

**Consequences.** `scripts/check-node.mjs` runs as `prebuild` and fails on Node < 20 with a readable message; the real failure (`string-width@8` RegExp `v` flag via yargs) only hits the Cloudflare build, never `next dev` (`4a537af`). Dev is deliberately not gated.

## ADR-005: worker.ts answers /api/hns before Next boots

**Status:** Active.

**Context.** Every panel read goes through the `/api/hns/*` proxy. Under OpenNext each call paid for loading the Next server (~150ms median Worker CPU) to forward one request.

**Decision.** `worker.ts` is the Worker entry (`wrangler.jsonc` `main`). It wraps the generated OpenNext worker and answers `/api/hns/*` for `app/lib/hnsForward.ts:FORWARDED_METHODS` itself via `app/lib/hnsForward.ts:forwardRequest`. The Next route `app/api/hns/[...path]/route.ts` (what `next dev` serves) uses the same function, so the two paths cannot drift. `hnsForward.ts` must stay free of Next imports.

**Evidence.** `c557b9e`.

**Consequences.** HEAD, OPTIONS and the `www` host still go to OpenNext. Upstream headers (Set-Cookie, Location) are dropped on purpose, as the Next route always did.

## ADR-006: Read-only static-assets cache; no revalidation

**Status:** Active.

**Context.** Every prerendered page (landing, docs, `/app` shell) re-rendered per request: `x-nextjs-cache: MISS`, 115–800ms TTFB.

**Decision.** `open-next.config.ts` uses `staticAssetsIncrementalCache` with `enableCacheInterception: true` — no KV/R2 binding. `public/_headers` makes `/_next/static/*` immutable for a year and `/atmosphere/*` one day.

**Evidence.** `3274bd8`.

> [!WARNING]
> The cache is read-only. It is safe only because nothing in the app uses `revalidate`, `revalidateTag` or `use cache`. Adding any of them requires a writable cache (R2/KV); with this one they silently never refresh. Pages with live data stay `force-dynamic` (ADR-021).

## ADR-007: BFF proxy; the MSG91 PAT is the session

**Status:** Active.

**Context.** The browser cannot call hostnsoft-api directly (CORS, credentials). hostnsoft-api no longer issues its own tokens.

**Decision.** All browser calls go to this app's `/api/*` routes (`app/lib/api.ts`). The MSG91 `proxy_auth_token` is kept in one httpOnly cookie, `app/lib/api.ts:PAT_COOKIE` (`hns_pat`), and forwarded as a header upstream. Login survives an unreachable hostnsoft-api because `app/lib/api.ts` can validate the PAT against MSG91 alone (`apiConnected: false` in `app/lib/session.tsx`). `app/lib/session.tsx` strips the token and MSG91's echoed `user_ref_id`/`company_ref_id` off the URL before anything reports it.

**Evidence.** `d10131a` (proxy auth), `dcbd0f7` (Members handed to MSG91's widget, with `app/api/auth/widget-token/` passing it the PAT — both removed on `feat/roles`, 2026-10-23, when the Members page became ours and hostnsoft-api took over adding and removing people), `e6cc00c` (`app/connector/login/` bridges AI-connector OAuth the same way), `5f32349` (`app/admin/guard.tsx:requireAdmin` requires `isSuperAdmin` from the API — the previous allowlist check let every signed-in user into `/admin`).

**Consequences.** Browser uploads must go through a server route (`9e01a24`), and are signed with the PAT plus `X-Company-Id` rather than a deploy token — a deploy token is a long-lived company secret that should exist only because someone asked for one.

## ADR-008: 5s reads, 10s writes, 120s uploads

**Status:** Active.

**Context.** Every upstream call waited 10s and `/auth/me` could chain two; a dead backend froze the panel for 20s.

**Decision.** `app/lib/hnsForward.ts:timeoutFor` — GET 5s (live P99 is about a second), changes 10s (a write we give up on may still land upstream, and an error for something that happened is worse than a slow success), uploads `app/lib/api.ts:UPLOAD_TIMEOUT_MS` 120s. Network failure becomes a clean 502, never an unhandled 500.

**Evidence.** `5624dd4`, `7d70639` (billing reads wait for the page's own data — the API answers concurrent reads slower than one), `cb25d21` (`app/lib/earlyReads.ts`, `app/lib/lastSeen.ts`: start reads in parallel with identity, paint last visit's copy first; wrong guess costs one request, never wrong data).

## ADR-009: GTM id pinned in code

**Status:** Active.

**Decision.** `app/lib/gtm.ts:DEFAULT_GTM_ID` is committed; `app/lib/gtm.ts:GTM_ID` ships it only in production, and `NEXT_PUBLIC_GTM_ID` overrides (empty string switches it off). Reason: `NEXT_PUBLIC_*` is inlined at build time and every dotenv file is gitignored, so an env-only id would silently ship an empty container from any build that isn't the author's. The id is public in page source anyway. Same reasoning pins `HOSTNSOFT_API_URL` in `wrangler.jsonc` (reviewable), while `EARLY_ACCESS_WEBHOOK_URL` stays in the dashboard with `keep_vars: true`.

**Evidence.** `9805f47`.

> [!WARNING]
> `/app/tokens` renders live secrets. Every third-party GTM tag must carry the blocking trigger on `^/app`, or a session recorder captures customer credentials. Never put email or name on the dataLayer.

## ADR-010: Landing A/B by middleware rewrite

**Status:** Active.

**Decision.** `middleware.ts` rewrites (never redirects) `/` to one of `/v1..//v4`; sticky `lp_variant` cookie (90 days), `?lp=vN` override, uncacheable assignment response, `X-Robots-Tag: noindex` on direct `/vN` hits. Arm names (Alpha–Delta) are not route names, so swapping a page is a change to `app/lib/variants.ts:VARIANTS` only. That table is shared with the client because the deploy prompt and tracking map route → arm; two copies would drift silently into mis-attributed deploys.

**Evidence.** `de13601`, `1b0c07f` (attribution resolved path-first, cookie fallback, drop when unknown; per-visitor counting; Wilson intervals and 100 visitors per arm before "WINNER"), `60e3ea3`.

**Consequences.** `app/robots.ts` must not block `/v1..//v4` — a blocked page is never fetched, so its noindex header is never read (`8e0ad15`). The four variant pages co-change constantly (inventory co_change: v1–v4 pairs 7–10 times each); `a1ec2d4` and `3e7a3b1` share their feature list and example cards for that reason.

## ADR-011: One deploy prompt, two lines, raw .md URL

**Status:** Active.

**Decision.** `app/lib/deployPrompt.ts:DEPLOY_PROMPT` is the single source for every copy affordance (`app/components/CopyPromptButton.tsx`). Two lines — intent plus the quickstart URL — and one contextual line only when the quickstart can't know it (token, existing app, signed in). Prompts name the raw Markdown URL: ~40 KB of prose instead of ~133 KB of HTML (`17a57ff`). The prompt opens by saying what Embarko is, because an agent that has never heard of it was being asked to deploy to it (`2ad96a5`).

**Evidence.** `a92e66f`, `e4a15b6` (pass the slug, not the display name: `X-App-Name` is the subdomain, and a placeholder left in creates a second app), `3f8de6c` ("reverting to old copy deployment prompt" — the shorter prompt was partly rolled back, no reason recorded).

> [!TODO]
> `3f8de6c` and `176fb28` reverted the prompt and quickstart to the 4 Oct hackathon versions without stating why. Confirm with the author before shortening the prompt again.

## ADR-012: Console prompts require a token; marketing stays anonymous

**Status:** Active.

**Context.** The console's prompt told the agent to deploy anonymously. An anonymous deploy lands under an orphan company, never appears in "Your apps", and is deleted after 24h — the opposite of what the console promised.

**Decision.** `app/lib/deployPrompt.ts:CONSOLE_DEPLOY_PROMPT` and `consoleDeployPromptFor` instruct the agent to use `DEPLOY_TOKEN` or `~/.embarko/credentials`, or ask. Marketing keeps anonymous-first — it is the pitch, and leading the docs with "get a token" turned a one-minute trial into a signup (`f072448`). Claiming is a redeploy of the same name with a token: `app/lib/deployPrompt.ts:consoleKeepPromptWithToken`, and the `/claim` page (`app/claim/page.tsx`) with `app/lib/deployPrompt.ts:consoleClaimedPromptWithToken`.

**Evidence.** `ff46977`, `4795dcb` (empty state asks "Did you deploy an app without signing in?"; token made on answer, never shown), `50ea3f8` / `3135f1d` (orphan claim link), `b1a61b8` (tokens page hands over a ready-to-paste prompt, not a bare 40-char string).

## ADR-013: Browser upload packs natively, 100 MB cap

**Status:** Active.

**Decision.** `app/lib/pack.ts` converts a folder or zip to the gzipped tar the deploy endpoint takes, using `CompressionStream`/`DecompressionStream` and hand-written tar/zip — a packing library would ship to every visitor for a screen most never open. `app/lib/pack.ts:MAX_PACKED_BYTES` is 100 MB: past that the upload is more likely a mistake (build output left in), and Cloudflare Free/Pro caps requests at 100 MB; 200 MB needs Business or direct-to-storage (`status/current-status.md`). `EXCLUDED_DIRS` mirrors the deploy script so an upload and an agent deploy of one folder produce the same app. Nested-app and delegating-root checks run in the browser before upload (`7b7b812`).

**Evidence.** `9e01a24`, `7b7b812`, `f3c0d8a`.

## ADR-014: /docs is the generated agent guide

**Status:** Active. Supersedes hand-written `content/docs/*.md` served at `/docs`, which superseded the API-published docs.md.

**History.** `dcbd0f7` fetched markdown from hostnsoft-api (it kept drifting from a hand copy). `82fbda7` served docs from this repo. `228d0ff` moved `/doc` → `/docs` because the prompt already pointed there (a 404). `a3059bf` and `9f6724d` removed duplicate copies (deploy-troubleshooting.md, docs.md) — each duplicate had already drifted into wrong instructions (a memory PATCH that no longer existed). `e19113b` replaced everything with the agent guide.

**Decision.** `app/lib/guide/content.js` is the only home of guide content; `app/lib/guide/markdown.js` renders Markdown/JSON for agents, `app/docs/` renders HTML, `app/lib/guide/discovery.js` builds llms.txt, OpenAPI and `.well-known`. `middleware.ts:guideFormat` picks the format from Accept, Markdown before HTML, an explicit .md or .json suffix always winning. `next.config.mjs:OLD_DOCS` redirects every old page and its Markdown twin — the capabilities manifest and installed deploy scripts still print `/troubleshoot`, read at the moment someone is stuck. `docs/WRITING.md` governs the prose.

**Consequences.** The generated skill copy under public/skills is gone; the skill repo is the only copy, with `/skills/embarko-deploy.sh` redirecting to its raw file so `curl` still gets a script. <!-- verify:ignore -->

## ADR-015: Live PRD — committed vs generated layers

**Status:** Active.

**Decision.** `app/lib/system/story.ts` (people-written, no imports so plain scripts can load it) is checked against `app/lib/system/facts.generated.json` (git-ignored, rebuilt before dev/build by `scripts/build-system-map.mjs` — a regex scan that must never break the build, so any failure keeps the old file and exits 0). `app/lib/system/facts.repos.json` (sibling-repo snapshot) and `app/lib/system/history.generated.json` (from git, `scripts/build-system-history.mjs`) are committed because production builds from a bundle with no sibling repos and no `.git`. `app/lib/system/load.ts` rescans on every page load in dev. `scripts/build-prd.mjs` writes `docs/prd/` from the same model; `npm run prd:check` fails when stale, and files carry no timestamps so it fails only on a real change.

**Evidence.** `99f540a` / `203062c`. Table links are inferred from column names because the site DB declares no foreign keys (`app/lib/system/links.ts`); `SECRET_COLUMN` keeps token-like columns server-side.

## ADR-016: Static OG image, static sitemap, apex canonical

**Status:** Active.

**Decision.** The Open Graph card is a committed PNG (`app/layout.tsx`): a generated opengraph-image route re-rendered on every request on the Worker and 500'd (`1016e54`, after `f1f2ccd` added it). The sitemap is static because it runs at build time where the D1 binding doesn't exist, so per-app Showcase pages are found by crawl (`8e0ad15`). Canonicals come from the root layout (`alternates: { canonical: "./" }`); titles use the `%s · Embarko` template because pages had spelled the brand three ways. `www.embarko.ai` 308-redirects to the apex in `next.config.mjs` — both hosts are custom domains on one Worker, and Search Console reported the www copies as duplicates despite canonicals. Rules in `docs/SEO.md`.

**Evidence.** `c2bcb60`, `749a1ba` (one `/:path*` rule sent the www root to `embarko.ai/:path*` literally; split into root and path rules), `cf8ea21`.

## ADR-017: One design system, no gradients, flat buttons

**Status:** Active.

**History.** `d1735c3` moved the accent from orange to black. `d7cd0d1` made the redesigned showcase look (cream, soft purple glow, glowing copy button) the site-wide system: `--ds-*` tokens in `app/design.css`, components in `app/components/ds/`. The same day `3fc316a` dropped the purple/pink gradients and glows for the original cream/warm-ink palette and flat buttons, and required the `ux-design-expert` skill before design work. `docs/DESIGN.md` "Colour rule": typography and layout carry the design; colour does not; `--ok` green only for Live.

> [!TODO]
> `3fc316a` records the change but not why the gradients lasted one day. Treat "no gradient, no glow" as a hard rule anyway; `docs/DESIGN.md` states it.

**Consequences.** `d7cd0d1` also removed a public panel showing API URLs, headers and a bearer token from `/v3` — the same rule `CLAUDE.md` §3 states.

## ADR-018: Follow the OS theme; no in-app picker

**Status:** Active.

**Decision.** `app/lib/theme.tsx:ThemeProvider` tracks `prefers-color-scheme` only; the Light/Dark/System row and its localStorage key were removed. A per-app override is one more thing to find, get wrong and explain. Pre-paint scripts (`app/lib/themeScript.ts`) read the media query so there is no flash. Toasts mount inside `ThemeProvider` and outside the shell in `app/app/console-shell.tsx:ConsoleShell` so navigation never unmounts one mid-flight.

**Evidence.** `9e7f267`. Known cost: anyone who had picked a theme lost it.

## ADR-019: Panel UX — "Your apps", no "New app", tokens out of the header

**Status:** Active; `CLAUDE.md` is the standing spec.

**Decision.** The panel shows the app and its state; the AI does the hosting work. "Get deploy token" left the header for the account menu (`48fd36c`); the breadcrumb row replaced the header (`8107360`, then a top bar with workspace and plan `67eadd2`); the empty state is one "Copy Embarko prompt" button and three steps, and the page polls until the app card appears (`48fd36c`, `a6658fd` `app/components/console/DeploySteps.tsx`); "Company" became "workspace" in UI only, API and code names unchanged, `/app/switch-company` redirected (`2d461e8`); workspace deletion and Members were dropped because the API has no DELETE route and never returned members (`01836d2`); memory sizing was removed from users' hands (`16a1354`); a failing scheduled job gets "Fix with your AI" with the error inside the prompt (`36b6871`, `app/lib/deployPrompt.ts:consoleFixSchedulePrompt`). Showcase actions are prompt-first; the submit form stays for later (`67eadd2`). Collections can auto-approve submissions (`ee930c9`, `AutoApproveField`) — no rationale in the commit.

**Rejected.** A per-app "Showcase" tab (`d50902c`) — moved into Overview and dropped (`0b0fe74`). A signup form on pricing — nobody creates an app by hand, so the CTA copies the prompt (`0654ebd`).

## ADR-020: Hostnames in one module

**Status:** Active.

**Decision.** `app/lib/site.ts` owns `SITE_HOST`, `SHIP_HOST`, `APP_DOMAIN`, `appUrl`; nothing under `app/` spells a hostname. Files that can't import TS (`app/lib/guide/*.js`, `wrangler.jsonc`, `next.config.mjs`) still carry literals and are updated by hand. Apps moved from `<name>.app.embarko.ai` to `<name>.embarko.app`.

**Evidence.** `3b96a0d`, `c0d9ded`, `bf31619` (API host pinned to `ship.embarko.ai`), `9a0b305` (Worker on custom domains: the zone has no DNS records, and a bare route pattern attaches but serves nothing).

## ADR-021: D1-backed pages are force-dynamic

**Status:** Active.

**Context.** `revalidate` made the Showcase routes static; `getCloudflareContext()` cannot run in a static export, the build threw, and every new route 404'd in production — including `/hackathons`, which touches no database.

**Decision.** Pages that read D1 use `force-dynamic`. Caching belongs at the edge (ADR-006), not in a build artefact that cannot reach the binding.

**Evidence.** `10027ad`.

---

## Lessons Learned & Incident Log

- **A/B metrics silently empty for weeks (ADR-001).** Root cause: native addon on workerd; dev used a different store so localhost passed. Prevention: `getDb` throws on a missing binding; dev runs the same D1 binding; an empty table and a broken store must never look alike.
- **Deploy swapped one 500 for another (`533c7a9`).** D1 created on the wrong Cloudflare account. Prevention: check `wrangler whoami` matches the account that serves `embarko.ai` before creating resources.
- **Cloudflare builds hung 30 minutes (ADR-003).** `next build` opened production D1. Prevention: anything dev-only in `next.config.mjs` is guarded on `NODE_ENV`; a build never needs the database.
- **Infinite build recursion (ADR-004).** Prevention: `buildCommand` stays `next build`; never put `opennextjs-cloudflare build` inside the command OpenNext calls.
- **Node 18 build fails with a regex SyntaxError (`4a537af`).** Prevention: `scripts/check-node.mjs` as `prebuild`, `.nvmrc` 22.
- **New routes 404 in production (ADR-021).** Static export touched D1. Prevention: D1 readers are `force-dynamic`; the sitemap stays static.
- **OG image route 500s on the Worker (ADR-016).** Prevention: committed PNG; `docs/SEO.md` bans generated OG routes.
- **www indexed as a duplicate (ADR-016).** Canonicals alone were not acted on. Prevention: host redirect in `next.config.mjs`, two rules (root and path); never link to `www`.
- **Mis-attributed A/B arms and CTR over 100% (`1b0c07f`).** Prevention: resolve arm path-first, drop unknowns, count per visitor, demand Wilson-interval separation before a winner.
- **Every signed-in user got the admin shell (`5f32349`).** The `ADMIN_EMAILS` allowlist applied only when set. Prevention: `app/admin/guard.tsx:requireAdmin` requires the API's `isSuperAdmin`; `isSuperAdmin` in `app/lib/session.tsx` is presentation, not protection.
- **Console deploys vanished after 24h (ADR-012).** Prevention: signed-in prompts always carry or ask for a token.
- **Placeholder prompt created a second app (`e4a15b6`).** Prevention: console prompts pass the slug.
- **Duplicate docs drifted into wrong instructions (`a3059bf`, `9f6724d`).** Prevention: one home per fact; redirect, never delete, a URL that was public (agents hold URLs for months).
- **False EU hosting claims on legal pages (`f93fa24`).** Prevention: `app/lib/trust.ts` bans every location claim; legal values are filled only when verified in code (`8fc6577`), the rest tracked in `docs/LEGAL-TODO.md` (`07956ba`, `cabc0bf`).
- **Billing slowed the apps list (`7d70639`).** The API answers concurrent reads slower than one. Prevention: secondary reads wait for the page's main read.

## Decisions with missing rationale

> [!TODO]
> `01ac604` revert of the build guard; `3f8de6c` / `176fb28` prompt and quickstart reverts; `bec2534` unsupported Next version flag; `ee930c9` showcase auto-approve; `b73325d` coupons via Lago (`app/components/console/CouponBox.tsx`); `866e7cb` litestream instructions for ORMs; `cd853f4` pglite removal. Each shipped without a commit body. Ask the author before reversing any of them.
