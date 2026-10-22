---
covers: ["*"]
verified_at: 105ccbb
verified_on: 2026-10-21
---
# Product Vision & Strategic Direction

Embarko (embarko.ai) hosts apps that people's AI agents build. **Embarko lets an app builder get the app their AI built online, see which apps are live or need attention, and change a live app or return to a version that worked.** The user's AI does the building and most of the hosting work; the panel only shows each app and its state.

This repo is the website, the user panel (`app/app/`) and the admin (`app/admin/`). Accounts, apps and billing live in the sibling control plane; builds and running apps live in the sibling deploy service. Neither sibling is documented here. <!-- verify:ignore -->

## Authoritative Sources & Status

- **Approved Direction** (confirmed by the owner on 2026-10-21):
  - The purpose statement above. It is the "Purpose" of the Live PRD (`docs/prd/README.md`), which the generated file still marks "not confirmed by a person yet"; the owner has now confirmed it.
  - The product rules in `CLAUDE.md`: core principle, home screen, "Deploy an app", no technical deploy data in normal UX, progressive disclosure, clear states, push work back to the AI, product language.
  - Non-goals listed under [Boundaries](#boundaries--non-goals).
  - Landing variants `app/v1/`, `app/v2/`, `app/v3/`, `app/v4/`, `app/v5/` are all part of the running A/B experiment. Keep all five. Visitors are bucketed into v1–v4 only; `/v5` stays outside the split for now (owner, 2026-10-22).
  - Release flow: feature branch → PR → merge `main` → Cloudflare Workers Builds deploys `main` automatically.
- **Current Implementation** (what ships at `105ccbb`): the 16 stories in `docs/prd/stories/`, generated from `app/lib/system/story.ts`. Where the code still differs from the approved direction, see [Gaps](#gaps-between-direction-and-code).
- **Proposals & Roadmaps:** see [Proposals](#proposals--roadmaps). Not approved; do not build them without asking.
- **Unknowns & Ambiguities:** marked `[!TODO]` below and collected in [docs/OPEN_QUESTIONS.md](OPEN_QUESTIONS.md). <!-- verify:ignore -->

Other trusted sources, in order of authority: `CLAUDE.md` → `docs/prd/README.md` and `app/lib/system/story.ts` → the agent guide `app/lib/guide/content.js` (served at `/docs`, the rules an agent follows) → landing copy (`app/v5/page.tsx:HERO`, `app/lib/features.ts:FEATURES`) → `app/lib/plans.ts:PLAN_DETAILS` → `content/guides/` → `status/current-status.md` → git log.

## Target Audience & Ideal Customer Profile (ICP)

The four people, as `app/lib/system/story.ts:AREAS` names them (lane `people`):

- **Primary: App builders.** Someone whose AI agent (Claude Code, Cursor, Replit, Antigravity… see `content/guides/`) built an app. They may not be a developer. They want it online and healthy without learning hosting. They talk to Embarko through their AI: they copy the Embarko prompt (`app/lib/deployPrompt.ts:DEPLOY_PROMPT`), paste it, and the AI deploys.
- **Visitors.** Land on a landing variant, read, browse the Showcase (`app/showcase/`), may deploy before signing up (story `try-without-account`), and may write to an app's builder (story `contact-dev`).
- **Showcase organisers.** Run a public page of apps built at an event (story `event-page`, `app/app/showcase/`).
- **Platform admins.** The Embarko team: every app, message, feature vote and the landing-page split verdict (`app/admin/`).

A fifth actor is the **AI agent itself**: it reads `/docs` (`app/lib/guide/content.js`), `app/llms.txt` and `app/openapi.json`, and sends feedback (story `ask-for-help`). Agent-facing docs follow `docs/WRITING.md`.

## Problems Solved & Value Proposition

| Customer Problem | How Embarko Solves It | Differentiator |
|---|---|---|
| "My AI built an app; I can't get it online." | One prompt: copy, paste into the AI, ask it to deploy. No repo, no Docker, no form (`app/lib/deployPrompt.ts`, story `first-deploy`). | The AI is the deploy tool. No GitHub, no CLI install required. |
| "I don't know if my apps are up." | One list, one label per app: Live / Starting / Not online / Needs attention (story `check-apps`). | States, not metrics. No server dashboards. |
| "Something broke after an update." | Redeploy via the AI, or put one of the last 3 working versions back live (story `fix-or-update`). | Rollback is a user action, not an ops task. |
| "I'm not sure I want an account yet." | Anonymous deploy first, claim by email later (story `try-without-account`, `app/claim/`). | Deploy before signup. |
| "My app needs a database, a domain, secrets, a timer." | Included per plan, the AI configures them (`app/lib/features.ts`, stories `app-settings`, `scheduled-task`). | "Nothing to provision" is the promise; `upcoming: true` marks what is not built. |
| "I want to show what I built." | Showcase listing and event pages (stories `showcase-listing`, `event-page`). | Built-in distribution for AI-built apps. |

Landing promise (`app/v5/page.tsx:HERO`): "Copy the Embarko prompt. Paste it into your AI agent. Get a live URL."

## Core Principles & Design Philosophy

From `CLAUDE.md` (authoritative; the numbers refer to its sections):

1. **The panel shows the app and its state. The AI agent does the hosting work.** Embarko is not an app builder and never edits code. If a screen exposes more infrastructure than necessary, simplify it.
2. **Deploy an app, not New app (§2).** Embarko does not create apps. The only entry is "Copy Embarko prompt" + three steps. No forms, no name field, no upload UI; the app appears when the AI deploys it.
3. **No technical deploy data in normal UX (§3, §4).** Never show API URLs, curl, bearer tokens, multipart fields or headers to a normal user. Raw tokens belong under Settings → Developer → API keys until "Connect AI" replaces them.
4. **One clear state, one action (§7).** Live → Open app · Not online → Deploy with your AI · Needs attention → See what happened / Fix with your AI. Never show conflicting states together.
5. **Push work back to the AI (§8).** Deployment failed → "Fix with your AI". Need configuration → give the user something to paste into their AI. The AI does the work; the panel explains state.
6. **Progressive disclosure (§5, §6).** App → Status → Result → Next action is the primary path. Domain, environment, history, logs exist but appear only when needed.
7. **Calm, minimal, premium (§9).** A place where apps live, with the sky/cloud direction. No heavy dashboards, grids everywhere, server visuals or dark developer-tool styling. Public pages follow `docs/DESIGN.md`; load the `ux-design-expert` skill before UI or copy work.
8. **Tiny navigation (§11).** Your apps · Account. Account holds Plan, Billing, Connected AI, Developer/API keys, Team.

### Product language

Say: **Live · Open app · Deploy · Update · Needs attention · Fix with your AI** (`CLAUDE.md` §12; the same list is `app/lib/guide/content.js:SAY`, which the AI is told to use).
Never: provision, runtime, execution environment, deployment artifact, infrastructure, resource allocation (`app/lib/guide/content.js:AVOID` adds container, build log, endpoint, HTTP status codes). Plans say "workspace", not "company" (git `cabc0bf`, PRD v24). Pricing copy avoids "database" in headlines (`app/lib/plans.ts:PlanFeature` tooltip rule).

## Strategic Priorities & Success Measures

- **Top priorities (read from what the repo invests in):**
  1. First-deploy conversion: five landing variants, the prompt on every section, deploy-before-signup, the panel's "watch it go live" flow (story `first-deploy`).
  2. Clear app state and recovery: Live / Needs attention labels, rollback, "Fix with your AI".
  3. Agents as first-class readers: `/docs`, `app/llms.txt`, `app/openapi.json`, `app/agent.json` generated from one file (`app/lib/guide/content.js`).
  4. SEO guides for each AI tool (`content/guides/`, `docs/SEO.md`).
- **Success measure in the code:** deploys per landing variant. `app/admin/dashboard.tsx` counts unique visitors and successful deploys per arm and declares a winner only with 100+ visitors on every arm and non-overlapping 95% Wilson intervals (story `pick-a-winner`). The arm is assigned by cookie in `middleware.ts` and read from `app/lib/variants.ts:VARIANTS`.
- **Secondary signals:** feature votes from the panel's "What's missing?" box (`app/components/console/FeedbackWidget.tsx`, `app/admin/feature-votes/votes.tsx`); plan changes (story `change-plan`).

> [!TODO]
> No target numbers (conversion rate, time-to-live, retention) are recorded anywhere in the repo. Ask the owner what "winning" means beyond the A/B verdict.

## Boundaries & Non-Goals

Confirmed by the owner:

- **Not an app builder or code editor.** The user's AI builds and changes the app. Embarko never edits code, shows an editor, or generates app code.
- **Not a traditional hosting dashboard.** No server, container, memory, CPU or infra views. Technical data appears only when it matters to the app's state.
- **No GitHub-required workflow.** Deploys come from the AI via upload (`POST /api/apps/upload` → deploy service). Git integration is not the path. <!-- verify:ignore -->
- **No managed databases as a product, no add-ons marketplace.** A database comes with a dynamic app (`app/lib/plans.ts:PLAN_DETAILS`); it is not provisioned, browsed or sold separately.

Anti-patterns that violate the vision:

- Adding curl, tokens, headers or API URLs to a normal-user screen.
- A "New app" button, a create-app form or an upload widget in the panel.
- Showing "Not deployed" next to "Open live URL".
- Promising an `upcoming: true` feature (`app/lib/features.ts`) as if it works.
- Adding a navigation module because hosting products usually have one.
- Fabricating a backend capability in the frontend (see protocol step 5).

## Gaps Between Direction and Code

Current implementation that the approved direction (`CLAUDE.md`) says to change. These are open work, not bugs to preserve:

- `app/app/tokens/page.tsx` is a top-level "Deploy tokens" page, and `app/lib/deployPrompt.ts` links to it. Direction: tokens under Settings → Developer → API keys, later replaced by Connect AI.
- The app page keeps `app/app/projects/[projectId]/deployments/`, `app/app/projects/[projectId]/domain/`, `app/app/projects/[projectId]/environment/` and `app/app/projects/[projectId]/settings/` as sibling routes. Direction (§5): a single app-first screen with technical sections secondary.
- The panel home (`app/app/page.tsx`) and `app/components/console/FirstAppEmpty.tsx` implement the prompt-first flow; check each new screen against §1 and §10 before adding anything.

> [!TODO]
> `app/lib/variants.ts:VARIANTS` lists four arms (/v1–/v4) while `middleware.ts` only adds `/v5` to its matcher. `/v5` is reachable directly but no visitor is bucketed into it, and `app/lib/system/story.ts` still says "four versions". The owner says all five are in the experiment: confirm whether /v5 should become a fifth arm.

## Proposals & Roadmaps

Under discussion or partly built. Not approved direction until the owner says so:

- **Connect AI replacing raw tokens** (`CLAUDE.md` §4). The OAuth-style pairing exists (`app/connector/`, story `connect-ai`: sign in, one-time code, AI swaps it for a key), but tokens are still the normal path in the panel and in the prompt.
- **Upcoming features** flagged `upcoming: true` in `app/lib/features.ts`: email, login, files, backups, private sharing, background jobs. Shown as "upcoming" on landing pages; not promised.
- **Feature votes** from the "What's missing?" box feed `app/admin/feature-votes/`; they are input to the roadmap, not the roadmap.
- `status/current-status.md` "Open / later": a mobile overflow on `/terms`, an optional upload hint. The file is dated 2026-09-28 and is not regenerated; treat it as a snapshot.
- PRD "Next steps, out of scope for now" (`docs/prd/README.md`): editing stories from the admin page, real-case replay, permissions per step, glossary.

## How Future Agents Must Evaluate Requests

1. **Align with Approved Direction.** Read `CLAUDE.md` and this file. Check the request against the principles, the ICP (an app builder talking through their AI) and the non-goals. Use the product language; rename anything that says provision/runtime/infrastructure.
2. **Improve unclear requests.** Ask which story in `docs/prd/README.md` the change serves and which state (Live / Not online / Needs attention) it affects. If a request says "add a dashboard for X", propose the state-and-next-action version instead. Prefer giving the user something to paste into their AI over adding a control to the panel.
3. **Flag conflicts and recommend declining.** Decline, with the reason, requests that: put curl, tokens, headers or API URLs in normal UX; add server or infra views; add a create-app form, upload UI or "New app"; add a code editor or AI code generation inside Embarko; require GitHub for deploys; sell databases or add-ons separately; add a top-level nav item beyond Your apps and Account. Offer the aligned alternative (developer docs, Settings → Developer, the prompt).
4. **Make direction changes explicit.** If the owner deliberately overrides a principle or non-goal, say so in the reply, update this file's Approved Direction and Boundaries in the same change, update `CLAUDE.md` if it contradicts, and record the decision in [docs/DECISIONS.md](DECISIONS.md). <!-- verify:ignore -->
5. **Contract boundaries, no fabricated integrations.** The panel reads the control plane through `app/lib/hnsApi.ts` and `app/lib/api.ts` and proxies it under `app/api/hns/`. If a feature needs an endpoint or field that does not exist, describe the required contract in [docs/CONTRACTS.md](CONTRACTS.md) and leave the UI honest (disabled, hidden, or "not available yet"). Never add a mock endpoint, fake success state or stubbed response that makes the backend look ready. <!-- verify:ignore -->
6. **Keep the PRD true.** A change that alters a story, step, table or named code: edit `app/lib/system/story.ts`, run `npm run prd`; `npm run prd:check` fails while it is stale.
7. **Public pages:** follow `docs/SEO.md`, `docs/DESIGN.md`, `docs/WRITING.md` before adding or changing one.
