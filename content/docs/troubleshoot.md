# Embarko Troubleshooting

Every error and log signature Embarko has really returned, with its cause and fix.

Each entry has three parts:

| Part | What it is |
|---|---|
| **Match** | The exact text to look for in a response body or in logs |
| **Cause** | Why it happens |
| **Fix** | What to do, and whether to retry |

This page covers deploying (`POST /apps`) and everything you do to an app after: env vars, rollback, custom domains, analytics, rename and delete. Memory is not on the list because nobody can change it. The call-by-call contract is in [`api.md`](api.md). Constraints to design around before you hit them are in [`limitations-and-recommendations.md`](limitations-and-recommendations.md).

## [Quick lookup by code](#quick-lookup-by-code)

| Status | Code or match | Retry? | Entry |
|---|---|---|---|
| none | Connection refused, DNS failure, hang | No | [The call never completes](#the-call-never-completes-connection-refused-dns-failure-or-a-hang) |
| 401 | `unauthorized` | No | [401 unauthorized](#401-unauthorized) |
| 409 | `app_name_taken` | No, change the name | [409 app_name_taken](#409-app_name_taken) |
| 409 | `not_supported_for_static` | No | [Env var write refused on a static site](#env-var-write-refused-on-a-static-site) |
| 422 | `unsupported_storage_pattern` | No, fix the code | [422 unsupported_storage_pattern](#422-unsupported_storage_pattern) |
| 422 | `no_manifest_at_root` | No, repackage | [422 no_manifest_at_root](#422-no_manifest_at_root) |
| 422 | `app_nested_in_subdirectory` | No, deploy the subfolder | [422 app_nested_in_subdirectory](#422-app_nested_in_subdirectory) |
| 422 | `rollback_image_unavailable` | No, pick a newer target | [Rollback target image unavailable](#rollback-target-image-unavailable) |
| 422 | Other rollback error | No, pick another target | [Rollback returns 422 for a different reason](#rollback-returns-422-for-a-different-reason) |
| 502 | `app_name_check_failed` | Yes, as is | [502 app_name_check_failed](#502-app_name_check_failed) |
| 502 | Agent customer-query endpoint | Yes | [502 from the agent customer-query endpoint](#502-from-the-agent-customer-query-endpoint) |
| 400 | `X-Agent-Name header is required` | No, add the header | [400 X-Agent-Name](#400-x-agent-name-header-is-required) |
| 404 | `{"error":"Not found"}` on status or logs | No, fix the token | [404 on status/logs](#404-on-statuslogs-endpoint) |
| 202 | `"status":"building"` or `"accepted":true` | Poll, don't resend | [Async operations](#async-operations-not-actual-failures) |
| 524 | `A timeout occurred` | Check upload first | [524 timeout](#524-timeout-historical-should-be-rare-now) |

## [Did the request reach the platform?](#before-anything-else-did-the-request-reach-the-platform)

Check this first. Any `4xx` or `5xx` means the platform answered. No status at all means it did not.

### [The call never completes: connection refused, DNS failure, or a hang](#the-call-never-completes-connection-refused-dns-failure-or-a-hang)

- **Match:** no HTTP status at all from `POST /apps`. A connection error, a DNS failure, a proxy rejection, or a request that hangs and dies.
- **Cause:** your environment is usually network-sandboxed with a domain allowlist that leaves out `ship.embarko.ai`. This is common in hosted AI coding tools. The request is blocked before it leaves, so nothing was submitted: no deploy, no status to poll, no logs.
- **Fix:** **don't retry.** The same call fails the same way.
  1. Use the Embarko MCP connector if one is available. Its requests don't come from your sandbox. Links are on [Connectors](connectors.md).
  2. Otherwise, tell the user your environment can't reach the API. It is not their app.
  3. Give them a script to run themselves.

  Full procedure: [agent playbook](agent-playbook.md#no-connectivity). Do **not** fall back to an anonymous deploy. It uses the same host, hits the same block, and would hand the user a temporary app they didn't ask for.

## [Rejected before the build: which errors stop a deploy?](#build-time-rejections-before-any-build-runs)

### [422 unsupported_storage_pattern](#422-unsupported_storage_pattern)

- **Match:** `"window.storage"` in the 422 response `detail`.
- **Cause:** the app calls `window.storage`. That API exists only inside the Claude Artifacts sandbox. The deploy is rejected before any build runs.
- **Fix:**
  1. Open the files listed in `filesDetected`. It is an array of the exact source paths that make the call, so you don't need to search.
  2. Replace the calls with SQLite (`better-sqlite3`) writing under `DATA_DIR`. See [Only `DATA_DIR` survives a redeploy](limitations-and-recommendations.md#only-data_dir-survives-a-redeploy).
  3. Redeploy.

```json
{
  "error": "Unsupported storage pattern detected",
  "detail": "This app calls window.storage, an API specific to Claude Artifacts' sandbox...",
  "filesDetected": ["src/app.jsx"],
  "docs": "https://embarko.ai/docs/docs.md#storage-requirements"
}
```

The `docs` URL is what the platform returns today. `/docs/docs.md` now redirects to the API contract and that fragment no longer exists. Use [the database capability](capabilities.md#database) instead. The platform should be updated to point there.

### [401 unauthorized](#401-unauthorized)

- **Match:** `{"error":"Unauthorized","code":"unauthorized"}`
- **Cause:** an `Authorization` header was sent, but the token is invalid or revoked. A missing header means an anonymous deploy, which is fine. A broken header is never treated as anonymous.
- **Fix:** check the token is live and not rotated or revoked. Or leave the header out entirely for an anonymous deploy.

### [409 app_name_taken](#409-app_name_taken)

- **Match:** `"already in use by a different company"`
- **Cause:** `X-App-Name` is also the live subdomain, so it must be unique across the whole platform, not just your account.
- **Fix:** pick a different `X-App-Name`. Or, if it is your orphan app, claim it with a real token before its 24h expiry.

### [422 no_manifest_at_root](#422-no_manifest_at_root)

- **Match:** `"code":"no_manifest_at_root"` in the 422 response. Before this check existed, the same problem showed as a generic build failure with a non-zero or unusual exit code and no real install or compile output before it.
- **Cause:** the app files sit in a subfolder instead of at the top of the archive. The build only looks at the archive root for a manifest (`package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Gemfile`, `composer.json`, `Cargo.toml`) or `index.html`. One single wrapping folder (for example a zip that already held one top-level folder) is fixed automatically. Anything more ambiguous returns this error instead of guessing.
- **Fix:**
  1. Read the response's `detail` and `foundNestedAt` fields. They say exactly where a manifest was found, if anywhere.
  2. Repackage so the manifest sits at the archive's top level.
  3. Redeploy.

  The `embarko-deploy` skill's `deploy.sh` also checks this locally. It fails before uploading and names the inner folder to point it at.

### [422 app_nested_in_subdirectory](#422-app_nested_in_subdirectory)

- **Match:** `"code":"app_nested_in_subdirectory"` in the 422 response.
- **Cause:** there **is** a `package.json` at the archive root, but it declares no dependencies of its own and hands the build to a subfolder. Examples: `"build": "npm --prefix frontend run build"`, a `cd frontend && …` script, or a `workspaces` entry. This is the usual frontend/backend repo, deployed from the repo root by mistake. Dependencies are only installed at the archive root, so the subfolder's `node_modules` never exists and the build dies minutes in on a missing command (exit code 127).
- **Fix:** deploy the subfolder itself. The response's `deployThisInstead` field names it (for example `frontend`). Upload that folder directly, or run `./scripts/deploy.sh ./frontend <app-name>`. **One deploy is one app.** A repo with a frontend and a backend needs two deploys under two app names.

### [502 app_name_check_failed](#502-app_name_check_failed)

- **Match:** `"code":"app_name_check_failed"`
- **Cause:** a short-lived internal error while checking whether the name is free.
- **Fix:** safe to retry as is. Change nothing.

## [The build started and failed: where do I look?](#build-failures-the-build-started-and-failed)

### [Build logs are available even when the build failed](#build-logs-are-available-even-when-the-build-failed)

- **Match:** none. Look here first for anything in this section.
- **Cause:** a failed build never starts a container, so there are no runtime logs.
- **Fix:** call `GET .../logs`. With no runtime logs, it returns the **build** output instead. The response carries `source: "build"` and a `note` saying so. It names the command that failed. Read it before guessing.

### ["npm run build" did not complete successfully: exit code: 127](#npm-run-build-did-not-complete-successfully-exit-code-127)

- **Match:** `exit code: 127`, usually followed by a line like `open /var/lib/docker/tmp/docker-import-… : no such file or directory`.
- **Cause:** exit 127 means **"command not found"** in the build image. `npm` ran fine. The tool the build script called is missing. Two common reasons:
  - the build tool isn't in the app's `dependencies` or `devDependencies`, or
  - the root `package.json` hands the build to a subfolder whose dependencies were never installed. That shape is now rejected before the build. See [422 app_nested_in_subdirectory](#422-app_nested_in_subdirectory).

  The `docker-import` line is only a side effect. No image was built, so importing it failed too. It is not the real error.
- **Fix:**
  1. Read `GET .../logs`. It names the missing command.
  2. Add that tool to the app's own dependencies, or deploy the subfolder that owns it.

## [The build passed but the app crashed: why?](#runtime-crashes-build-succeeded-app-failed-after)

### [OOM killed](#oom-killed)

- **Match:** `"OOM Killed"`, `Exit Code: 137`
- **Cause:** the app used more than its 256MB of memory. Common reasons: an embedded database the platform didn't auto-detect, or a dev server (for example a "dev" CLI) shipped as the production start command.
- **Fix:** **shrink the app. You cannot raise the limit.** There is no agent call for memory and the dashboard control is gone.
  1. Use a production start command instead of a dev server. This is by far the most common cause.
  2. Drop any embedded database you don't use.
  3. Don't hold large data in memory.
  4. Redeploy.

  If memory ever becomes adjustable again, setting it only saves the value. See [Memory cannot be changed today](#memory-cannot-be-changed-today).

### [Crash loop exhausted](#crash-loop-exhausted)

- **Match:** `"Not Restarting"`, `"Exceeded allowed attempts"`
- **Cause:** a symptom, not the root cause. The real reason is logged just above this line, usually an OOM kill or an uncaught startup exception.
- **Fix:** read `GET .../logs`, find the cause above this line, fix it, and redeploy. A redeploy resets the attempt counter.

### [Pull access denied for a freshly built image](#pull-access-denied-for-a-freshly-built-image)

- **Match:** `"pull access denied"`
- **Cause:** a platform bug. An image was referenced without a proper local version tag. Normal use of the deploy API doesn't cause it.
- **Fix:** you can't fix it. Report the app name and the timestamp.

### [WebAssembly apps fail with CompileError and a blank page (fixed for all apps)](#webassembly-apps-fail-with-compileerror-and-a-blank-page-fixed-platform-wide)

- **Match:** the browser console shows `CompileError` from `WebAssembly.compile` or `instantiate`, or a CSP violation naming `script-src`. The page loads (200) but is blank.
- **Cause:** an old problem. Static builds (Godot, Unity, Emscripten and Rust-wasm exports have no `package.json`) are served by Railpack's built-in static file server. Its default Content-Security-Policy had no `'wasm-unsafe-eval'` in `script-src`. Before the fix, the platform set no CSP at the edge, so the browser saw whatever the app's container set.
- **Fix:** apps deployed or redeployed after the fix need nothing. The platform now sets a default CSP at the edge for every app (the old one plus `'wasm-unsafe-eval'`). It overrides anything the app's container sets.
  1. Check with `curl -sI https://<app>.embarko.app/ | grep -i content-security-policy`.
  2. If `wasm-unsafe-eval` is missing, the app hasn't been redeployed since the fix. Trigger any redeploy, even a rollback to the current version.

## [Why can't I see my app's status or logs?](#access-ownership)

### [404 on status/logs endpoint](#404-on-statuslogs-endpoint)

- **Match:** `{"error":"Not found"}` from `GET .../status` or `.../logs`
- **Cause:** a claimed app's status and logs need the owning company's token. An orphan app accepts no token at all. A wrong or missing token on a claimed app always returns 404, so it never confirms the app exists.
- **Fix:** send `Authorization: Bearer <deploy token>` for a claimed app. Leave the header out if the app is still meant to be an orphan.

## [Why did my customer query fail?](#customer-queries-feature-requests-feedback-other)

The path is `.../customer-query` on all three routes (dashboard, public, agent). It was `.../feature-requests` before 2026-09-09. Same data and behavior. `type` now also accepts `"other"` alongside `"feature"` and `"feedback"`.

### [400 "X-Agent-Name header is required"](#400-x-agent-name-header-is-required)

- **Match:** `"X-Agent-Name header is required"`
- **Cause:** you called `POST <ship host>/apps/:appName/customer-query` (the agent path) without the `X-Agent-Name` header.
- **Fix:** add `X-Agent-Name: <your agent's name>`. It is free text. Any value that identifies the calling agent works.

### [502 from the agent customer-query endpoint](#502-from-the-agent-customer-query-endpoint)

- **Match:** HTTP 502 from `POST .../apps/:appName/customer-query`
- **Cause:** an internal error while forwarding or storing the request.
- **Fix:** short-lived, safe to retry. If it keeps failing, check the input:
  - `type` must be one of `platform_bug`, `missing_capability`, `docs_issue`, `unexpected_behavior`, `other`, `feature` or `feedback`.
  - `message` must be 1 to 5000 characters.

## [Why won't my custom domain work?](#custom-domains)

### [Custom domain DNS not propagated](#custom-domain-dns-not-propagated)

- **Match:** `"DNS does not yet point at the platform"`
- **Cause:** the domain's DNS record isn't set correctly yet, or hasn't propagated.
- **Fix:**
  1. Check the CNAME or A record matches the `POST .../domains` response exactly.
  2. Retry `.../verify` after propagation. Safe to retry many times.

### [Verify stuck on "Not resolving yet" despite a correct-looking record](#verify-stuck-on-not-resolving-yet-despite-a-correct-looking-record)

- **Match:** `POST .../domains/<domain>/verify` keeps failing, or the dashboard shows `"Not resolving yet"`, even though the CNAME or A record matches exactly.
- **Cause:** the DNS provider is proxying the record (for example Cloudflare's orange-cloud "Proxied" mode) instead of serving plain DNS. A proxied record resolves to the provider's own proxy IPs, not the value shown, so verification can't confirm it.
- **Fix:**
  1. Switch the record to DNS-only (unproxied). In Cloudflare, click the orange cloud next to the record so it turns grey.
  2. Retry `.../verify`. It should pass within a minute or two. There is no propagation delay here, only the mode change.

### [Apex (root) domains lose your CDN/proxy in front of them](#apex-root-domains-lose-your-cdnproxy-in-front-of-them)

- **Match:** none. This is how DNS works, not an error.
- **Cause:** a subdomain gets a `CNAME` to a dedicated platform hostname that is never proxied. An apex domain (`yourdomain.com`, no subdomain) can't use `CNAME` under standard DNS rules. It gets an `A` record pointing straight at the platform's origin server IP instead. So an apex domain talks to the origin directly, and any CDN or DDoS protection you'd get from proxying (Cloudflare and others) doesn't apply.
- **Fix:** use a subdomain (`app.yourdomain.com`) instead of an apex domain if you want to keep your own CDN or proxy in front of this app.

### [Custom domain activation requires port 80 reachable](#custom-domain-activation-requires-port-80-reachable)

- **Match:** none. It shows up as verification that never succeeds.
- **Cause:** custom domains use an HTTP-01 challenge. The platform's own domains use DNS-01. HTTP-01 needs port 80 reachable and not redirected for `/.well-known/acme-challenge/*`. If your own firewall or proxy in front of this domain blocks or redirects port 80, verification and certificate issuance never finish.
- **Fix:** before anything else, confirm port 80 reaches the platform unchanged for this hostname.

## [What happens to anonymous ("orphan") deploys?](#anonymous-orphan-deploys)

### [Your app disappears ~24 hours after an anonymous deploy](#your-app-disappears-24-hours-after-an-anonymous-deploy)

- **Match:** none. This is by design.
- **Cause:** a deploy with no `Authorization` header creates an unclaimed ("orphan") project. It is torn down 24 hours after creation unless claimed. The running app, its routing and its image are all removed.
- **Fix:** redeploy the same `X-App-Name` **with** a valid token before it expires. That claims it for your company, cancels the expiry, and from then on it works like any other project.

  The warnings are `app.expiresAt` and the claim steps in the status reply's `next` once the app is live, plus an in-app banner (see below). No reminder email is sent before expiry.

### [The in-app "will be deleted" banner doesn't show up](#the-in-app-will-be-deleted-banner-doesnt-show-up)

- **Match:** none. A known limit, not a bug.
- **Cause:** a sidecar proxy in front of the app injects the banner by rewriting `text/html` responses. It works with any language or framework. A JSON-only API has no HTML page to inject into. The status reply's `app.expiresAt` and `next` are still the official notice. They just never reach a browser.
- **Fix:** nothing to fix for non-HTML apps. Rely on the status reply instead of the banner.

## [Why does my app show a "hosted on Embarko" footer?](#embarko-footer)

### [A "hosted on Embarko" footer appears at the bottom of the app](#a-hosted-on-embarko-footer-appears-at-the-bottom-of-the-app)

- **Match:** none. This is by design.
- **Cause:** the company is on the Free plan. The platform adds the footer to the app's HTML pages as they are served. It is not in the app's code.
- **Fix:** none needed. To remove it, the user upgrades to a paid plan at [embarko.ai/app/billing](/app/billing). That is their decision, like any plan change. Don't hide the footer from the app's own code.

### [The footer is still there after upgrading](#the-footer-is-still-there-after-upgrading)

- **Match:** none.
- **Cause:** the footer comes off every app of the company shortly after an upgrade, usually within a minute and without a redeploy. A page that still shows it after that is usually a copy the browser cached from before.
- **Fix:** reload the page without the cache. If it is still there after a few minutes, [contact support](/support) with the app name.

## [Which responses look like failures but aren't?](#async-operations-not-actual-failures)

### [202 Accepted misread as "live" (deploy)](#202-accepted-misread-as-live-deploy)

- **Match:** `{"success":true,"status":"building"}` (or `"publishing"` for a very large static site), HTTP 202, from `POST /apps`. A static site that published in time answers `200` with `"status":"live"` and needs no polling.
- **Cause:** not a failure. The deploy API answers at once and the build continues in the background.
- **Fix:** poll `links.status` from the response until `status` is `"live"` or `"failed"`. Never treat `202` as done.

### [Env var write refused on a static site](#env-var-write-refused-on-a-static-site)

- **Match:** `{"code":"not_supported_for_static"}`, HTTP 409, from `PUT .../env-vars`, `PUT .../env-vars/<key>` or `POST .../env-vars/apply`
- **Cause:** the app is a static site (`app.kind: "static"`). It is served straight from its files and nothing runs on the server, so env vars have nowhere to go.
- **Fix:** put the configuration in the site's files (for example a `config.js`), or deploy it as a server app under a new app name.

### ["No logs" for a static site](#no-logs-for-a-static-site)

- **Match:** `{"status":"not_available"}` from `GET .../logs`, with `app.kind: "static"`
- **Cause:** not a failure. A static site runs no process, so there is nothing to log.
- **Fix:** nothing to fix. If a page looks wrong, check the uploaded files and redeploy.

### [202 Accepted misread as "done" (rollback)](#202-accepted-misread-as-done-rollback)

- **Match:** `{"accepted":true,"deploymentId":"...","statusUrl":"..."}`, HTTP 202, from `POST .../rollback`
- **Cause:** not a failure. The platform confirmed the target image exists (the one check worth failing fast on) and is applying the rollback in the background. The app may not be running the old version yet.
- **Fix:** poll the response's `statusUrl` (`GET .../deployments/:deploymentId`) until `status` is no longer `"in_progress"`.

### [524 timeout (old, should be rare now)](#524-timeout-historical-should-be-rare-now)

- **Match:** `524`, `"A timeout occurred"`
- **Cause:** the deploy endpoint used to wait for the full build before answering. The async 202 flow above fixed that. If you see it now, the slow part is probably the upload, not the build.
- **Fix:** check upload size and network first. Report it if it keeps happening on a normal-sized upload.

## [Why did my rollback fail?](#rollback)

### [Rollback target image unavailable](#rollback-target-image-unavailable)

- **Match:** HTTP 422, `"code":"rollback_image_unavailable"`, from `POST /api/apps/<app-name>/rollback` with `{"deploymentId": "..."}` (the agent path, deploy token) or the dashboard's Rollback button. The message starts with `"Cannot roll back: the image is no longer available"`. Older responses said `"is no longer available on this host"`. Branch on `code`, which is stable, not on either wording.
- **Cause:** images are built on the platform's host and never pushed to a registry. Only the most recent few are kept (see [`limitations-and-recommendations.md`](limitations-and-recommendations.md#only-the-last-n-build-images-are-kept-per-app)). The response's `retainCount` field says exactly how many. The target version's image has already been removed.
- **Fix:** roll back to one of the last `retainCount` deployments instead (see `GET .../deployments`). Or redeploy the old source fresh if you still have it. The exact number is in the error response, so you don't need to look it up.

### [Rollback returns 422 for a different reason](#rollback-returns-422-for-a-different-reason)

- **Match:** HTTP 422 from `POST .../rollback`, and `error` does NOT start with `"Cannot roll back: the image is no longer available"`
- **Cause:** the target deployment didn't succeed (`status !== "success"`) or has no recorded image tag.
- **Fix:** pick another deployment from `GET .../deployments`. Only successful deployments with an image can be rollback targets.

## [Which changes need a redeploy to take effect?](#configuration-changes-that-dont-apply-until-you-redeploy)

### [Memory cannot be changed today](#memory-cannot-be-changed-today)

- **Match:** none. A constraint, not an error.
- **Cause:** every app gets 256MB. There is no agent call to change it and the dashboard control was removed, so neither you nor the user can raise it. Don't look for an endpoint.
- **Fix:** reduce the app's own footprint. See [OOM killed](#oom-killed). If memory becomes adjustable again: saving a value used to only **save** it. The new limit applied on the next config rebuild (a deploy, a rollback, or a custom domain change). Rolling back to the *current* version applied it with no rebuild.

### [Env var changes need a redeploy to reach the running app](#env-var-changes-need-a-redeploy-to-reach-the-running-app)

- **Match:** none. Expected behavior, not an error.
- **Cause:** env vars are written into the app's configuration at deploy time. They are not pushed live to a running container.
- **Fix:** after writing an env var, do one of these so the app sees the new values:
  1. Call `POST /api/apps/<app-name>/env-vars/apply`. This is faster because it skips the build.
  2. Or trigger a new deploy (`POST /apps`, even with unchanged source).

  Exact calls: [environment variables contract](api.md#env-vars).

## [Where are the platform's limits?](#platform-level-constraints-apply-to-every-app-always-true-not-failures)

Limits that apply to every app, all the time, are not failures. They are listed with a recommendation for each in [`limitations-and-recommendations.md`](limitations-and-recommendations.md).
