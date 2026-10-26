---
covers: ["*"]
verified_at: 105ccbb
verified_on: 2026-10-21
---
# Open Questions & Known Ambiguities

The owner reviewed the questions raised on 2026-10-21 and closed the list on 2026-10-22: the code is the intended behaviour unless `CLAUDE.md` says otherwise. Decisions recorded then: `/v5` stays outside the A/B split for now; panel copy ("Running", "Host new app", "Open live URL") stays; the upload tab in the deploy dialog stays; a trial app may be claimed either on the next deploy or by code on `/claim`; the unused members client and the unimported `ui/separator`, `ui/skeleton` files were deleted.

Add a row here only for a genuine unknown you hit while working: topic, affected `path:symbol`, the conflicting evidence, and what would resolve it.

## Active Questions Table

| ID | Topic / Question | Affected Code | Conflicting Evidence / Current Status | What Would Resolve It |
|---|---|---|---|---|
| Q1 | How long does a super-admin `proxy_auth_token` stay valid for the monitor? | `app/lib/monitor/server.ts:tickEnv` (`MONITOR_PROXY_TOKEN`) | The site keeps the session cookie 30 days, but MSG91's own token lifetime and rotation aren't documented anywhere in the three repos. If it expires, app data reads fail and the "Monitoring can't read app data" alert fires. | MSG91's token lifetime, or an internal-secret stats route in hostnsoft-api (docs/MONITORING.md "What can't it see yet?"). |
| Q2 | How are production D1 migrations applied? | `migrations/0006_monitoring.sql` | No script or CI applies them (docs/DEVELOPMENT.md "D1 Migrations"). The monitor answers 503 until 0006 is applied. | The team's confirmed command, presumably `npx wrangler d1 migrations apply hostnsoft-ab --remote` from the socket account. |

## Known Technical Limitations & Verification Gaps

- **Panel and admin not exercised in a browser.** `/app/*` and `/admin/*` need a real MSG91 sign-in; there is no bypass or test account. Verification of those screens after the cleanup was by typecheck and production build only.
- **D1 in dev.** `POST /api/events` returns 500 locally unless the logged-in wrangler account can reach database `hostnsoft-ab`; the baseline session could not. Public pages still render.
- **No tests, no lint baseline.** Typecheck (`npx tsc --noEmit`) and `npm run build` are the only automated gates.
- **Sibling repos.** `hostnsoft-api` and `hostnsoft-deploy` were read only to confirm route shapes in [CONTRACTS](CONTRACTS.md); their behaviour is not documented here.
- **`next build` and `next dev` share `.next/`.** Running `npm run build` while the dev server is up corrupts both (ENOENT on `routes-manifest.json`, "Cannot find module for page"). Stop the dev server first. <!-- verify:ignore -->
