# hostnsoft — Embarko website, panel and admin

Embarko (embarko.ai) hosts apps that people's AI agents build. This repo is the Next.js 15 site, the user panel (`/app`) and the admin (`/admin`), deployed as one Cloudflare Worker. It owns no product data: every app, account and billing fact comes from the sibling `hostnsoft-api` through this app's BFF routes. The product rule is **the panel shows the app and its state; the AI agent does the hosting work**.

## Commands

| Task | Command |
|---|---|
| Install dependencies | `npm install` |
| Run dev server (port 3000) | `npm run dev` |
| Type check | `npx tsc --noEmit` |
| Build for production | `npm run build` (stop the dev server first: both use `.next/`) |
| Preview the Worker | `npm run preview` |
| Regenerate the Live PRD | `npm run prd` |
| PRD freshness check | `npm run prd:check` |
| Lint / tests | none usable: no ESLint config, no test suite |

## Reading Order Before You Change Code

1. **Purpose, non-goals, request protocol:** [docs/VISION.md](docs/VISION.md) and [CLAUDE.md](CLAUDE.md) (the owner's UX rules; authoritative).
2. **Mental model, state, rendering, footguns:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
3. **The journey you are touching:** [docs/FLOWS.md](docs/FLOWS.md), then the step-by-step story in [docs/prd/README.md](docs/prd/README.md).
4. **API, auth, storage, analytics shapes:** [docs/CONTRACTS.md](docs/CONTRACTS.md).
5. **Public page or panel UI:** [docs/DESIGN.md](docs/DESIGN.md); public pages also [docs/SEO.md](docs/SEO.md); `/docs` or `content/` text also [docs/WRITING.md](docs/WRITING.md).
6. **Setup, env vars, verification, release:** [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
7. **Why things are the way they are:** [docs/DECISIONS.md](docs/DECISIONS.md).
8. **What nobody has decided yet:** [docs/OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md).

## Project Rules & Boundaries

1. **Never show curl, tokens, API URLs, headers or multipart fields in normal UX.** Only "Copy Embarko prompt". Technical detail lives in `/docs` and the prompt itself (CLAUDE.md §3).
2. **Embarko does not create apps.** No "New app", no create form, no app-name field. The app appears after the AI deploys it (CLAUDE.md §2).
3. **Use the product language.** Live · Open app · Deploy · Update · Needs attention · Fix with your AI. Never provision, runtime, infrastructure, artifact. The AI is told the same list in `app/lib/guide/content.js` (`SAY`).
4. **One clear state, one action.** Never render "Not deployed" next to "Open live URL". Status mapping lives in one place: `app/components/console/HealthPill.tsx` (CLAUDE.md §7).
5. **Push work back to the AI.** A failure or a configuration need becomes something the user pastes into their AI, not a new panel control (CLAUDE.md §8).
6. **A change to a story, step, table or code a story names must edit `app/lib/system/story.ts` and run `npm run prd`.** `npm run prd:check` fails while `docs/prd/` is stale. Never hand-edit `docs/prd/`.
7. **`worker.ts` and `app/api/hns/[...path]/route.ts` must stay behaviour-identical.** Both only call `app/lib/hnsForward.ts:forwardRequest`; auth, header and timeout changes go there. Dev runs the route, production the shim.
8. **A build must never touch D1.** Keep `initOpenNextCloudflareForDev()` guarded on `NODE_ENV=development` in `next.config.mjs`; an unguarded call hangs Cloudflare's build for 30 minutes. Nothing prerendered may call `getDb`.
9. **No filesystem at runtime.** Markdown is bundled via the webpack `asset/source` rule; OG images are committed PNGs. Never add an image route or a request-time `fs` read (docs/SEO.md).
10. **No `revalidate`, `revalidateTag` or `use cache`.** The incremental cache is read-only static assets; revalidation would silently never run (docs/ARCHITECTURE.md).
11. **`NEXT_PUBLIC_*` is inlined at build and every .env is gitignored.** Production values that must survive a Cloudflare build are pinned in code or `wrangler.jsonc`, not env files.
12. **Server-only modules stay server-only.** `app/lib/api.ts` imports `next/headers`; client code uses `app/lib/client.ts` and `app/lib/hnsApi.ts`. `app/lib/hnsForward.ts` and `app/lib/variants.ts` must stay free of Next imports.
13. **Public pages follow the three checklists** (SEO, DESIGN, WRITING) and load the `ux-design-expert` skill before design or copy work; say so if the skill is unavailable rather than skipping it.
14. **Never fabricate a backend capability.** If `hostnsoft-api` lacks an endpoint, describe the contract in docs/CONTRACTS.md and keep the UI honest (hidden or "not available yet").
15. **Legal pages carry no guessed values.** `docs/LEGAL-TODO.md` lists what is missing; add a value only with approval.

## Where Things Are

- `app/` — Next App Router. `app/v1/` … `app/v5/` landing A/B arms (all five stay); `app/app/` panel; `app/admin/` admin; `app/showcase/` public gallery; `app/docs/` + `app/lib/guide/content.js` the agent guide; `app/guides/` + `content/guides/` SEO guides; `app/api/` BFF routes.
- `app/lib/` — session, typed API client (`hnsApi.ts`), BFF helpers (`api.ts`, `hnsForward.ts`), deploy prompt, plans, tracking, D1 (`db.ts`), Live PRD model (`app/lib/system/`).
- `app/components/ds/` public design layer; `app/components/ui/` shadcn-style panel primitives; `app/components/console/` panel pieces.
- `worker.ts`, `wrangler.jsonc`, `open-next.config.ts`, `next.config.mjs` — Worker entry, bindings, OpenNext, redirects.
- `migrations/` — D1 schema. `scripts/` — PRD generation and build checks. `docs/prd/` — generated, never edited.
- `docs/` — this canonical set plus the owner's checklists (`SEO.md`, `DESIGN.md`, `WRITING.md`, `LEGAL-TODO.md`).

## PR & Deployment Flow

- **Branching:** `feat/<name>`, `fix/<name>`, `feature/<name>` from `main`. Commits are conventional-ish (`feat(scope): …`).
- **Pre-PR gate:** `npx tsc --noEmit`, `npm run build`, `npm run prd:check` (run `npm run prd` first if a story changed), a browser pass on the dev server for anything visible, and the ai-docs verifier (`/ai-docs check`) if docs changed. <!-- verify:ignore -->
- **Pipeline (owner-confirmed):** feature branch → pull request on GitHub (`Walkover-Web-Solution/hostnsoft`) → merge to `main` → **Cloudflare Workers Builds auto-builds and deploys `main`** to embarko.ai. No CI in the repo; no staging. `npm run deploy` is a manual escape hatch only.

## Verification & Knowledge Maintenance

- **Baseline first.** At the verified commit: typecheck 0 errors, build exit 0, `prd:check` exit 1 on 19 pre-existing "in no part" items (see docs/DEVELOPMENT.md). Know which failures are yours.
- **Preserve invariants:** routes and redirects in `next.config.mjs`, appearance, `hns_pat` cookie and localStorage keys, admin gates, A/B events, SEO metadata.
- **Remove code only with evidence** across runtime registration, dynamic imports, Next route conventions, `variants.ts`, CSS, build config and agent-facing routes. Uncertain → OPEN_QUESTIONS.
- **Docs change with code, in the same commit.** Update the `docs/*.md` whose `covers:` matches your files and bump its `verified_at`/`verified_on`. <!-- verify:ignore -->
