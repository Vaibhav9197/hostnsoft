# API contract

The rules for an agent running an app on Embarko with no person watching.
Each action lists its method, auth, parameters, response, states, errors,
retry rule, and what happens if you call it twice.

Read [How to behave](#how-to-behave) first. It prevents the costly mistakes.
The per-action reference follows.

| Action | Call | Auth |
| --- | --- | --- |
| [Deploy or redeploy](#deploy) | `POST /apps` | Optional |
| [Check status](#status) | `GET /apps/<name>/status` | None until claimed |
| [Read logs](#logs) | `GET /apps/<name>/logs` | None until claimed |
| [Deployment history](#history) | `GET /api/apps/<name>/deployments` | Token |
| [Roll back](#rollback) | `POST /api/apps/<name>/rollback` | Token |
| [Change web address](#change-address) | `POST /api/apps/<name>/slug-change` | Token |
| [Env vars](#env-vars) | `/api/apps/<name>/env-vars` | Token |
| [Showcase](#showcase) | `PUT /api/apps/<name>/showcase` | Token |
| [Request a token](#token-request) | `POST /api/public/deploy-tokens/request` | None |
| [Send feedback](#feedback) | `POST /apps/<name>/customer-query` | None until claimed |
| [Capabilities](#capabilities-endpoint) | `GET /capabilities` | None |
| [Domains, analytics, rename, delete](#manage) | `/api/apps/<name>/…` | Token |

All calls are on `https://ship.embarko.ai`.

## [How to behave](#how-to-behave)

### [What names an app?](#identity)

**`X-App-Name` is the app's identity.** It is also the public subdomain, so it
is unique across the whole platform, not per company. There is no project id
and no create step. The first deploy of a name creates the app. Every later
deploy of that name updates it.

- **To update an app, deploy the same name again.** Do not invent `my-app-2`.
  A redeploy of a name you own returns `2xx` and replaces the running app in
  place. It keeps its env vars, domains and `DATA_DIR` data.
- **`409 app_name_taken` means a different company owns the name.** It does
  not mean "your app already exists". That case is a normal successful
  redeploy. Pick a different name. Do not retry the same one.
- **Exception:** an unclaimed anonymous app that *you* just deployed. Redeploy
  it with a token to claim it.

Store the app name you used. It is the only handle you need for status, logs,
env vars, history, rollback and Showcase.

### [Which calls need a token?](#auth-model)

Everything is on `ship.embarko.ai`. **The path prefix does not tell you the
auth rule.** Use this table:

| Auth | Calls |
| --- | --- |
| **None, ever** | `GET /capabilities` (and `/capabilities/<topic>`, `/capabilities/all`); `POST /api/public/deploy-tokens/request`; `POST /api/public/customer-query` (rate limited); `GET /api/public/showcase/apps/<name>` (an app's current listing) |
| **None while the app is an unclaimed anonymous deploy; the owning company's token once claimed** | `POST /apps` (deploy); `GET /apps/<name>/status`; `GET /apps/<name>/logs`; `POST /apps/<name>/customer-query` |
| **Deploy token, always** | `/api/apps/<name>/domains…`; `GET /api/apps/<name>/analytics`; `PATCH /api/apps/<name>` (rename); `DELETE /api/apps/<name>`; and everything under `/api/apps/<name>/…`: env vars, deployments, rollback, showcase, slug-change |

Two path shapes share the host:

- **Under `/apps`:** only deploy (`POST /apps`), status, logs and app feedback
  (`/apps/<name>/status`, `/logs`, `/customer-query`).
- **Under `/api/apps/<name>`:** everything else that names an app. That is the
  app itself (`GET`, rename with `PATCH`, `DELETE`), domains, analytics, env
  vars, deployment history, rollback, showcase and slug-change.
- `/apps/<name>/domains` without `/api` is a `404`.

The token:

- Is sent as `Authorization: Bearer <token>`.
- Is company-wide, not per app.
- Deploys only. It does not sign in to the dashboard.
- How to get one, and the two ways in that need no token (a connector, or
  signing in on embarko.ai), are in [Authentication](capabilities.md#agent-auth).

**No header and a bad header are different.** Leaving out `Authorization` is
a valid anonymous deploy. A present but invalid token is always a hard `401`.
It is never downgraded to anonymous.

**A claimed app answers `404`, not `401`, to a caller without the right
token** on the deploy host. It will not confirm the app exists to a non-owner.
So `404` on status or logs means "not yours, or not found", never "definitely
does not exist".

### [What does an error look like?](#error-envelope)

Every non-2xx response carries both fields:

```json
{ "error": "Human-readable sentence that may change wording", "code": "machine_readable_code" }
```

- **Branch on `code`. Never parse `error`.**
- Some responses add fields that name the fix: `details`, `detail`,
  `foundNestedAt`, `deployThisInstead`, `retainCount`. Read them first. Several
  tell you exactly what to change.
- New fields may appear in any response over time. Branch only on fields named
  here and ignore the rest. Do not fail on an unknown key.

### [When should I retry?](#retry-policy)

Retrying a permanent error burns the rate limit and achieves nothing. Go by
status class, with two exceptions:

| Status | Retry? | What to do |
| --- | --- | --- |
| `400`, `401`, `403`, `404`, `409`, `422` | **No** | The request is wrong. Fix the cause named by `code`, then send a *different* request. |
| `502 app_name_check_failed` | **Yes** | Transient internal check. Retry the identical request once, then back off. |
| `429` | **Yes, slowly** | Rate limited. Back off. Do not loop. |
| `500`, `502`, `503`, `504` (others) | **Once** | Retry once after a pause. If it repeats, stop and report. A deploy may still have been accepted, so check status before re-uploading. |
| Network timeout on `POST /apps` | **Check first** | The upload may have landed. Call status before retrying, or you will deploy twice. |

- **Backoff:** wait 2s, then 5s, then 15s. Three attempts total, then stop and
  tell the user.
- Never retry in a tight loop. Never retry a `4xx`.
- **Rate-limited endpoints return the same response whether or not you hit
  the limit.** A retry cannot tell you it worked. Treat one call as your only
  call.

### [What happens if I call it twice?](#idempotency)

Nothing takes an idempotency key.

| Action | Repeating it |
| --- | --- |
| `POST /apps` | **Not idempotent.** Each call is a new deploy and a new history entry. Same name updates in place, so it is *safe* but not free. Check status before retrying a timeout. |
| `GET` anything | Safe, always. |
| `PUT /env-vars/<key>` | Idempotent. Same value, same result. |
| `DELETE /env-vars/<key>` | Idempotent in effect. |
| `POST /env-vars/apply` | Safe to repeat. Re-applies current values. |
| `POST .../rollback` | **Not idempotent.** Each call creates a new deployment entry. Repeating with the same target is harmless but noisy. |
| `PUT /showcase` | Idempotent. A second call updates the listing, no error. |
| `POST /deploy-tokens/request` | **Emails a token each time.** Rate limited. Call once. |

### [Which actions are async, and what are the states?](#async)

Two actions answer `202` at once and finish in the background:

- **Deploy** (`POST /apps`): poll `links.status`.
- **Rollback:** poll the returned deployment.

**`202` means accepted, never live.** Reporting a URL on the `202` is the most
common autonomous failure.

States come from the `status` field of `GET .../status`:

```
building / publishing ──▶ starting ──▶ live     → report the URL, then do what `next` says
                      └─▶ failed               → read links.logs, fix, redeploy
                                  └─▶ crashed  → built, but stops on start: read links.logs
```

| State | Meaning |
| --- | --- |
| `publishing` | A static site. No build, live in seconds. |
| `not_deployed` | Nothing under this name. |
| `unknown` | No record of a recent deploy. The service may have restarted. If the URL responds, the app is live. |

How to poll:

1. Server app: poll every 10 seconds.
2. Static site: usually no polling. Its deploy reply is already `live`.
3. Static site that came back `publishing` (a very large site): poll every 2
   seconds.
4. Give up after 10 minutes and read the logs.

### [How is every reply shaped?](#reply-shape)

`POST /apps`, `GET .../status` and `GET .../logs` share four fields:

| Field | What it holds |
| --- | --- |
| `status` | Where things stand, in one word. |
| `app` | Only what the next step needs: `name`, `kind` (`service` or `static`), `claimed`, and `expiresAt` while the app is temporary. No URLs. |
| `next` | **One** short sentence: what to do now. Follow it. Later steps (claiming, Showcase) appear in later replies once they apply. When a step needs more, `links.help` points to the [capabilities topic](#capabilities-endpoint) with full steps. |
| `links` | **Every URL in the reply, and only here.** The ones `next` refers to, plus `feedback`. The app's address is `links.app`, present once live. `next` names them (`links.status`) instead of repeating the URL. |

- Errors keep `error` and `code` (branch on `code`) and add `next` and `links`.
- `links.feedback` is on every reply. Report anything failing or confusing
  there.
- Use the links the reply gives you. Do not build them from the app name. That
  way you keep working if the address format changes.

---

## [Deploy or redeploy an app](#deploy)

**`POST https://ship.embarko.ai/apps`** · async · not idempotent

**Auth:** optional.

- Leave out `Authorization` for an anonymous deploy.
- Send `Bearer <token>` to create or update an app your company owns, or to
  claim an anonymous one.

**Required:**

| Where | Name | Rules |
| --- | --- | --- |
| header | `X-App-Name` | `^[a-z0-9-]+$`, 3–63 chars, no leading or trailing dash, unique platform-wide. Also the subdomain. |
| multipart field | `source` | `.tar.gz` of the app's source, manifest at the archive root. Leave out installed packages, build output, caches, `.git` and `.env` files; see the example below. |

Or send the source as JSON. See [JSON source](#deploy) below.

**Optional:**

| Where | Name | Default | Notes |
| --- | --- | --- | --- |
| header | `Authorization` | none (anonymous) | `Bearer <token>` |
| header | `X-App-Version` | a timestamp | `^[a-zA-Z0-9._-]+$`. Pass a git SHA or tag. Never reuse a tag for different code. |
| header | `X-App-Type` | none | What the app is for, as a short plain label, e.g. `personal website`, `portfolio`, `landing page`, `blog`, `task management`, `feedback system`, `dashboard`, `e-commerce store`. Printable ASCII, at most 60 characters. See **App type** below. |
| header | `X-Scale-To-Zero` | always on | `true` lets an idle server app sleep. `false` turns it back off. See [scale to zero](capabilities.md#scale-to-zero). |
| header | `X-Agent-Name` | none | The deploying agent, lowercase: `claude-code`, `claude`, `chatgpt`, `codex`, `cursor`, `copilot`, `gemini`, and so on. Printable ASCII, at most 60 characters. See **Agent name** below. |

**Example request:**

```bash
tar -czf /tmp/my-app.tar.gz \
  --exclude=.git --exclude='.env*' \
  --exclude=node_modules --exclude=dist \
  -C /path/to/app .

curl -X POST "https://ship.embarko.ai/apps" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" \
  -H "X-App-Name: my-app" \
  -H "X-App-Version: $(git rev-parse --short HEAD)" \
  -H "X-App-Type: portfolio" \
  -H "X-Agent-Name: claude" \
  -F "source=@/tmp/my-app.tar.gz"
```

The excludes above are examples. Leave out whatever the build makes or
downloads for this project (installed packages, build output, caches), plus
`.git` and any `.env` file. Check what a folder holds before excluding it: a
folder named `build` or `vendor` can be source. Keep source, config, lock
files, tool wrappers and the manifest. Write names without a trailing slash.
Full guidance: [Package the app](agent-quickstart.md#package).

**App type (`X-App-Type`).** Optional, but send it when you can. Use the
example label that fits best, or your own short phrase. To choose it:

1. If what the app does is clear from what you built or what the user said,
   use that. Don't ask.
2. If it isn't clear, ask the user once, when you confirm the app name:
   *"What kind of app is this (for example a personal website, portfolio, task
   manager or feedback system)? You can skip this."*
3. If the user skips, leave the header out. The deploy works without it.

Send it once. A redeploy without the header keeps the earlier value. A
redeploy with a new value replaces it. It does not change how the app is built
or run.

**Agent name (`X-Agent-Name`).** Optional, but always send it. It is the name
of the agent or product you run as.

- The app's deploy history shows it, so the owner sees which agent deployed
  what.
- It is only a label. It changes nothing you can do, and nothing checks it.
- Send the same value on [rollback](#rollback) and on [env var](#env-vars)
  writes and applies. Those also create deploy history entries.

**Sending the source as JSON.** Use this when you can't upload a file, for
example through an MCP tool or from a sandbox that can't make outbound
requests. Send `Content-Type: application/json`. Auth, response, errors and
build are the same as the multipart upload.

| Field | Required | Notes |
| --- | --- | --- |
| `appName` | Yes (or `X-App-Name` header) | Same rules as `X-App-Name`. The header wins if both are sent. |
| `files` | Yes | Array of `{ "path", "content", "encoding"? }`. `path` is relative to the app root (manifest at the root). `encoding` is `"utf8"` (default) or `"base64"` for binary files. |
| `version` | No | Same as `X-App-Version`. |
| `appType` | No | Same as `X-App-Type`. |
| `agentName` | No | Same as `X-Agent-Name`. |

- **Limits:** 25 MB body, 2000 files. For bigger apps, use the multipart
  upload.
- Leave out `node_modules`, build output, `.git` and `.env*`. The platform
  installs and builds for you.
- Send text files as plain text. Use base64 only for binaries.

```bash
curl -X POST "https://ship.embarko.ai/apps" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "appName": "my-app",
    "files": [
      { "path": "index.html", "content": "<h1>Hello</h1>" },
      { "path": "logo.png", "content": "iVBORw0KGgo...", "encoding": "base64" }
    ]
  }'
```

**Success: `202 Accepted`** (a server app, deployed without a token):

```json
{
  "success": true,
  "status": "building",
  "app": {
    "name": "my-app",
    "kind": "service",
    "claimed": false,
    "expiresAt": "2026-09-30T10:04:00.000Z"
  },
  "next": "Building: poll links.status every 10 seconds until it says \"live\" or \"failed\".",
  "links": {
    "status": "https://ship.embarko.ai/apps/my-app/status",
    "feedback": "https://ship.embarko.ai/apps/my-app/customer-query"
  }
}
```

**A static site** (an `index.html` and assets, nothing to build) is published
while the request waits, so the reply is the result:

| Outcome | Reply |
| --- | --- |
| Published within 5 seconds | **`200 OK`**, `status: "live"`, `app.kind: "static"`. Same `next` and `links` as a live status reply: the claim step with `links.help` → `capabilities/claim` while temporary, or the Showcase step once claimed. |
| Takes longer than 5 seconds | `202`, `status: "publishing"`. `next` says to check `links.status`. |
| Publishing fails | `500`, `success: false`, `code: "publish_failed"`, `status: "failed"`. |

```json
{
  "success": true,
  "status": "live",
  "app": { "name": "my-site", "kind": "static", "claimed": false, "expiresAt": "2026-09-30T10:04:00.000Z" },
  "next": "Live: give the user links.app and tell them it will be deleted at 2026-09-30T10:04:00.000Z unless claimed. To claim it, follow links.help.",
  "links": {
    "app": "https://my-site.embarko.app",
    "feedback": "https://ship.embarko.ai/apps/my-site/customer-query",
    "help": "https://ship.embarko.ai/capabilities/claim"
  }
}
```

Other reply variants:

- **With a token:** `app.claimed` is `true` and there is no `expiresAt`.
- **A redeploy that claims a temporary app:** `next` starts with "Claimed: this
  app is now permanent".
- **A server app replaced by a static site:** `next` starts with a warning. Its
  server is removed and it can't become a server app again.
- **`app.expiresAt`** is the exact deletion time of a temporary app. Give the
  user that time, not a vague "24 hours". There is no reminder email.

**Failure: `409`:**

```json
{
  "error": "App name \"my-app\" is already in use by a different company",
  "code": "app_name_taken",
  "next": "That name belongs to someone else: pick a different one.",
  "links": {
    "feedback": "https://ship.embarko.ai/api/public/customer-query"
  }
}
```

Before the app exists (a rejected name, a bad token), `links.feedback` is the
public feedback address. It takes the user's `email` in the body.

**Errors:**

| Code | Status | Retry | Meaning and action |
| --- | --- | --- | --- |
| `invalid_app_name` | 400 | No | Missing, or fails the pattern. Slugify and resend. |
| `invalid_app_version` | 400 | No | Fails `^[a-zA-Z0-9._-]+$`. |
| `invalid_app_type` | 400 | No | `X-App-Type` is over 60 characters or has non-printable or non-ASCII characters. Shorten it, or leave it out. |
| `invalid_agent_name` | 400 | No | `X-Agent-Name` is over 60 characters or has non-printable or non-ASCII characters. Use a plain name like `claude`, or leave it out. |
| `missing_source_file` | 400 | No | No `source` in the multipart body, or no non-empty `files` array in a JSON body. |
| `invalid_file_path` | 400 | No | JSON body only. A `files[].path` is absolute or contains `..`. Use paths relative to the app root. |
| `invalid_file_content` | 400 | No | JSON body only. A `files[].content` isn't a string. |
| `invalid_file_encoding` | 400 | No | JSON body only. `encoding` must be `utf8` or `base64`. |
| `invalid_json` | 400 | No | JSON body doesn't parse. |
| `source_too_large` | 413 | No | JSON body over 25 MB. Use the multipart upload. |
| `too_many_files` | 413 | No | Over 2000 files in a JSON body. Drop `node_modules`/build output, or use the multipart upload. |
| `unauthorized` | 401 | No | Token present but invalid or revoked. Leaving it out is anonymous, not an error. |
| `app_name_taken` | 409 | No | **Another company owns this name.** Pick a different one. Never retry. |
| `unsupported_storage_pattern` | 422 | No | App calls `window.storage`. Replace with SQLite under `DATA_DIR`. |
| `no_manifest_at_root` | 422 | No | Manifest is nested. Read `foundNestedAt` and repackage from that folder. |
| `app_nested_in_subdirectory` | 422 | No | Root hands the build to a subfolder. Deploy the folder named in `deployThisInstead`. One deploy is one app. |
| `invalid_static_root` | 422 | No | The Staticfile's `root` points outside the upload. Point it at a folder inside it. |
| `app_kind_changed` | 422 | No | The app is a static site and this upload is a server app. A static site can't become one. Deploy under a new app name. |
| `rename_in_progress` | 409 | Yes, later | The app's web address is being changed. Wait, then deploy under its new name. |
| `app_name_check_failed` | 502 | **Yes** | Transient. Retry the identical request. |
| `deploy_failed` | 500 | Once | Build or schedule step failed. Read `details`. |
| `publish_failed` | 500 | Once | A static site's files couldn't be published. Redeploy once. If it fails again, report it to `links.feedback`. |

**After a `202`:** poll `links.status` until `status` is `live`, `failed` or
`crashed`. Report the URL only on `live`.

---

## [Check deploy status](#status)

**`GET https://ship.embarko.ai/apps/<app-name>/status`** · sync · safe

**Auth:** none while the app is an unclaimed anonymous deploy. The owning
company's token once claimed.

**Parameters:** none beyond the app name in the path.

**Live, not claimed yet: `200`.** This reply brings up claiming:

```json
{
  "status": "live",
  "app": {
    "name": "my-app",
    "kind": "service",
    "claimed": false,
    "expiresAt": "2026-09-30T10:04:00.000Z"
  },
  "next": "Live: give the user links.app and tell them it will be deleted at 2026-09-30T10:04:00.000Z unless claimed. To claim it, follow links.help.",
  "links": {
    "app": "https://my-app.embarko.app",
    "feedback": "https://ship.embarko.ai/apps/my-app/customer-query",
    "help": "https://ship.embarko.ai/capabilities/claim"
  },
  "deploy": {
    "status": "success"
  }
}
```

**Live and claimed: `200`.** This reply brings up Showcase:

```json
{
  "status": "live",
  "app": {
    "name": "my-app",
    "kind": "service",
    "claimed": true
  },
  "next": "Live: give the user links.app. If they want it listed publicly, follow links.help.",
  "links": {
    "app": "https://my-app.embarko.app",
    "feedback": "https://ship.embarko.ai/apps/my-app/customer-query",
    "help": "https://ship.embarko.ai/capabilities/showcase"
  },
  "deploy": {
    "status": "success"
  }
}
```

**Failed: `200`.** `error` names the cause. `links.logs` points at stderr:

```json
{
  "status": "failed",
  "app": {
    "name": "my-app",
    "kind": "service",
    "claimed": true
  },
  "error": "Exit code 127 means a command in the build script was not found inside the build image. …",
  "next": "Build failed: read links.logs, fix the cause, and redeploy with the same name. If it isn't clear, report it to links.feedback (see links.help).",
  "links": {
    "feedback": "https://ship.embarko.ai/apps/my-app/customer-query",
    "logs": "https://ship.embarko.ai/apps/my-app/logs?stream=stderr",
    "help": "https://ship.embarko.ai/capabilities/feedback"
  },
  "deploy": {
    "status": "failed"
  }
}
```

- **States:** `status` is one of `building`, `publishing`, `starting`, `live`,
  `failed`, `crashed`, `not_deployed`, `unknown`. See
  [Async behaviour and states](#async).
- **A sleeping app** (scale to zero) reads `live`. `next` says it wakes on the
  first request.
- **Static sites** have no server. `live` means the files are published. There
  is no separate health check, and `next` never mentions logs.
- **Deprecated:** `deploy.status` (`in_progress`, `success`, `failed`,
  `unknown`) stays for older copies of the deploy script. Read `status`
  instead. `deploy` will be removed.
- **Not durable:** status reflects the most recent attempt held in memory. Use
  [deployment history](#history) for durable history.

**Errors:** both carry `next` and `links.feedback`.

| Code | Status | Retry | Action |
| --- | --- | --- | --- |
| `not_found` | 404 | No | Not yours, or no such app. Check the name and the token. |
| `unauthorized` | 401 | No | The token was rejected. |

---

## [Read logs](#logs)

**`GET https://ship.embarko.ai/apps/<app-name>/logs`** · sync · safe

**Auth:** same rule as status.

**Optional:** `?stream=stderr` (default `stdout`).

**Success: `200`:**

```json
{
  "available": true,
  "allocId": "b457e652-...",
  "stream": "stdout",
  "logs": "...tail of recent output..."
}
```

- `logs` is about the last 8KB of output.
- It is a snapshot at call time, not a stream. Call again to follow along.
- Always the most recent allocation, healthy or not.
- No long-term retention and no retention guarantee.
- **When the latest build failed**, the reply holds the **build** output
  instead, with `source: "build"` and a `next` saying the cause is in there.
  The failing command is named there. This includes a failed redeploy while
  the previous version still runs.

**Static site: `200`.** Nothing runs on the server, so there are no logs:

```json
{
  "status": "not_available",
  "available": false,
  "reason": "This is a static site, so there are no app logs: nothing runs on the server.",
  "app": {
    "name": "my-site",
    "kind": "static"
  },
  "next": "Static sites have no logs: if a page looks wrong, check the files and redeploy (see links.help).",
  "links": {
    "feedback": "https://ship.embarko.ai/apps/my-site/customer-query",
    "help": "https://ship.embarko.ai/capabilities/static-sites"
  }
}
```

**Nothing deployed yet: `200`:**

```json
{
  "available": false,
  "reason": "No allocation has ever been created for this app yet",
  "next": "No logs yet because the app hasn't started: check links.status.",
  "links": {
    "status": "https://ship.embarko.ai/apps/my-app/status",
    "feedback": "https://ship.embarko.ai/apps/my-app/customer-query"
  }
}
```

---

## [List deployment history](#history)

**`GET https://ship.embarko.ai/api/apps/<app-name>/deployments`** · sync · safe

**Auth:** deploy token, always.

**Returns:** the app's deployments, newest first.

- Each entry has at least an **id**, a **status**, and the **version**
  deployed.
- Use the id for `GET /deployments/<id>` and for rollback.
- Only entries with status `success` are valid rollback targets.

Each entry also says who made it:

| Field | Values |
| --- | --- |
| `source` | `"dashboard"` (a person in the dashboard) or `"agent"` (anything using a deploy token: an AI agent, CI or a script). `null` on some very old entries. |
| `agentName` | Whatever `X-Agent-Name` the deploy sent, or `null`. |
| `triggeredBy` | The dashboard user, or the deploy token's label. |

**`GET .../deployments/<id>`** returns one entry. Use it to poll a rollback to
completion.

**Errors:**

| Status | Retry | Meaning |
| --- | --- | --- |
| 401 | No | Invalid token. |
| 404 | No | Unknown app, or not yours. |

---

## [Roll back to an earlier deployment](#rollback)

**`POST https://ship.embarko.ai/api/apps/<app-name>/rollback`**
· async · not idempotent

**Auth:** deploy token, always.

**Optional body:**

- `{}` or no body: go back to the most recent successful deployment that isn't
  the current one. Usually what you want.
- `{"deploymentId": "..."}`: pick a specific version. Read the history first.
  `rollbackTarget: true` marks the valid targets.

**Example:**

```bash
curl "https://ship.embarko.ai/api/apps/my-app/deployments" \
  -H "Authorization: Bearer $DEPLOY_TOKEN"

curl -X POST "https://ship.embarko.ai/api/apps/my-app/rollback" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" -H "Content-Type: application/json" \
  -H "X-Agent-Name: claude" \
  -d '{"deploymentId": "<deploymentId>"}'   # or '{}' for the previous good one
```

**Success: `202 Accepted`:** `{ accepted, deploymentId, rolledBackTo: { id, version }, statusUrl, terminal: false }`.

- Rollback creates a **new** history entry pointing at the old image. History
  is never rewritten.
- Poll until its status leaves `in_progress`.
- No rebuild. It reruns an existing image under **current** configuration:
  today's env vars and domains, not those of the original deploy.

**Failure: `422`:**

```json
{ "error": "Cannot roll back: the image is no longer available...", "code": "rollback_image_unavailable", "retainCount": 5 }
```

**Errors:**

| Code / shape | Status | Retry | Action |
| --- | --- | --- | --- |
| `no_rollback_target` | 422 | No | No earlier successful deployment exists. Fix forward and redeploy. |
| `rollback_image_unavailable` | 422 | No | Image pruned. `retainCount` says how far back you can reach. Pick a newer target, or redeploy the old source. |
| other `422` | 422 | No | Target never succeeded, or has no image. Pick a different deployment. |
| `unauthorized` | 401 | No | Bad token. |
| (none) | 404 | No | Unknown app or deployment, or not yours. |

---

## [Change an app's web address](#change-address)

**`POST https://ship.embarko.ai/api/apps/<app-name>/slug-change`**
· async · not idempotent

**Auth:** deploy token, always.

**Required:** `newName` in the body.

This changes the URL itself. `PATCH /api/apps/<name>` is different: it changes
the display name and leaves the URL alone.

**Ask the user first.** The old address stops working the moment the new one
is live. There is no redirect, anything linking to it breaks, and someone else
can claim the freed name. See [escalation](escalation.md#destructive).

**Example:**

```bash
curl -X POST "https://ship.embarko.ai/api/apps/my-app/slug-change" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newName": "my-better-app"}'
```

**Success:**

| App | Reply |
| --- | --- |
| Live | **`202 Accepted`** with `statusUrl`, `appUrl`, and `deployWith` (the `X-App-Name` to use from now on). |
| Never deployed | `200` with `terminal: true`. A single database write, already done. |

**Poll** `GET https://ship.embarko.ai/api/slug-changes/<project-id>` until
`terminal` is true.

- `state` ends `succeeded` or `failed`.
- `currentSlug` always says where the app actually is.
- A failed migration leaves the app on its old address, untouched.

**Errors:**

| Code / shape | Status | Retry | Action |
| --- | --- | --- | --- |
| `invalid_app_name`, `app_name_too_short`, `app_name_too_long` | 400 | No | Same rules as `X-App-Name`: `^[a-z0-9-]+$`, 3–63 characters, no leading or trailing hyphen. |
| `app_name_reserved` | 409 | No | Platform-reserved name. Pick another. |
| `app_name_taken` | 409 | No | Held platform-wide, not just in your company. |
| `deploy_in_progress` | 409 | Yes | Wait for the deploy to finish. |
| `rename_in_progress` | 409 | Yes | One is already running for this app. |
| `no_current_deployment` | 409 | No | Running, but no record of which image is live. Deploy once, then retry. |
| `slug_change_cooldown` | 429 | Later | One change per app per week. `retryAfterMs` says when. |
| `app_state_unknown` | 503 | Yes | Couldn't confirm whether the app is running. Fails closed. |
| `rename_failed` | 502 | Yes | The migration was refused or rolled back. The app is untouched. |
| `rename_desynced` | 500 | No | The app moved but the move wasn't recorded. Needs a person. |

**Good to know:**

- **Slow for a live app:** minutes, not seconds. It needs a fresh HTTPS
  certificate for the new hostname. The app is stopped while its stored data
  moves, and it keeps that data.
- **Afterwards, deploy with the new name.** A call to the old name gets
  `404 app_renamed` with `newName` and a `retryUrl`. Follow that. Do not deploy
  a fresh app under the old name. That creates a second, empty app.
- **A custom domain carries over** and keeps working throughout. An app with
  one keeps its real address.
- **A Showcase listing follows the rename.** Its page moves to
  `/showcase/app/<new-name>`.

---

## [Environment variables](#env-vars)

Base: `https://ship.embarko.ai/api/apps/<app-name>/env-vars`. **Deploy token
always.**

| Operation | Method & path | Idempotent | Notes |
| --- | --- | --- | --- |
| List keys | `GET /env-vars` | yes | **Keys only. Values are never returned.** |
| Set several | `PUT /env-vars` | yes | Body `{"vars": [{"key", "value"}], "apply": true}`. **A merge:** keys you send are added or updated, every other key is left alone. Remove one with `DELETE`. |
| Set one | `PUT /env-vars/<key>` | yes | Body `{"value": "...", "apply": true}`. |
| Delete one | `DELETE /env-vars/<key>` | yes | |
| Apply to running app | `POST /env-vars/apply` | yes | Required. See below. |

**Key rule:** `^[A-Za-z_][A-Za-z0-9_]*$`.

**Example:**

```bash
curl -X PUT "https://ship.embarko.ai/api/apps/my-app/env-vars/STRIPE_KEY" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "sk_live_..."}'

curl -X POST "https://ship.embarko.ai/api/apps/my-app/env-vars/apply" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" \
  -H "X-Agent-Name: claude"
```

**A write only stores the value.** The running app does not see it until you
do one of these:

1. Call `POST /env-vars/apply`.
2. Deploy again.
3. Send `"apply": true` on the write. It applies at once with no rebuild
   (`202`, with a `statusUrl` to poll).

Leave `apply` off to batch several writes into one restart. Writing a key and
reporting success without applying leaves the app on the old value.

**Good to know:**

- **Send `X-Agent-Name`** on the apply call and on any write with
  `"apply": true`. Applying creates a deploy history entry. On these calls a
  malformed name is ignored, not rejected.
- **Values are write-only.** You can never read a secret back, with or without
  the token. If you need a value, ask the user.
- **Static sites have no env vars.** Setting or applying one on a static site
  (`app.kind: "static"`) is refused with `409` `not_supported_for_static`. Put
  configuration in the site's files, or deploy it as a server app under a new
  name. Listing and deleting still work.

---

## [List on Showcase](#showcase)

**`PUT https://ship.embarko.ai/api/apps/<app-name>/showcase`** · sync ·
idempotent

**Auth:** deploy token. The app must be [claimed](agent-playbook.md#claim). A
temporary app has no token to call this with.

**Only when the user wants it listed.** Then:

1. **Check for an existing listing:**
   `GET https://ship.embarko.ai/api/public/showcase/apps/<app-name>` (no
   token). An app has one listing, reused on the public gallery and every
   event page. If it exists, reuse its details and send only what changes.
2. **Draft the rest from the project.** Infer tagline, what it does, the AI
   that built it, a category and tags from the code, README and live app.
   Write for people searching: what it does, who it is for, the problem it
   solves, in plain words.
3. **Ask only for what you can't know:** who built it, a profile link, and
   whether to show a contact email. Never invent creator details, links,
   screenshots, an event slug or a code.
4. **Show the user the listing and get their go-ahead** before the `PUT`. A
   public listing is live the moment it is sent.

**Body:**

| Field | Required | What to send |
| --- | --- | --- |
| `collectionSlug` | | The event Showcase page's slug, e.g. `"walkover"`. **Leave it out for the public gallery.** |
| `code` | | The event page's submit code, if the organiser gave one. Skips their review. |
| `name` | | Defaults to the app's current name. Becomes the page title, **and renames the app in the dashboard**. |
| `tagline` | first listing | One line: what it does and who it's for, about 60–160 characters. Used as the page's search description. |
| `creatorName` | first listing | The person or organisation that built it. Shown as the author. |
| `description` | | What it does: features and use cases, in plain searchable words. Up to 4000 characters. |
| `story` | | Why it was built, in the creator's words. Up to 600 characters. |
| `creatorProfile` | | An `https` link to the creator: GitHub, X, LinkedIn or a personal site. |
| `contributorEmails` | | Everyone who built the app, max 10, the person showcasing it first (the main contact). Adds a "Contact Dev" button that mails all of them. Visitors never see the addresses. **Ask before sending it.** |
| `builtWith` | | The tool that built it: `Claude`, `Codex`, `Cursor`, `Lovable`, `Replit`, or another. |
| `category` | | The closest of `AI Tool`, `Personal`, `Business`, `Productivity`, `Education`, `Game`, `Developer Tool`, `Other`. |
| `tags` | | Terms people would search for, not the category again. At most 8. |
| `screenshotUrls` | | `https` image URLs, at most 10. **The first is the card and social-share image**, so use a real screenshot, not a logo. |
| `videoUrl` | | A demo video, e.g. YouTube or Loom. |
| `customHtml` | | Extra content for the listing page, up to 50,000 characters. Its headings and text are indexed. |
| `prd` | | The app's product spec, for "Build similar app". |

**Example:**

```bash
curl -X PUT "https://ship.embarko.ai/api/apps/my-app/showcase" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" -H "Content-Type: application/json" \
  -d '{
    "collectionSlug": "walkover",
    "code": "Z3H63FRD",
    "name": "My App",
    "tagline": "One line about it",
    "description": "What it does",
    "story": "Why it was built",
    "creatorName": "Jane",
    "creatorProfile": "https://x.com/jane",
    "contributorEmails": ["jane@example.com", "sam@example.com"],
    "builtWith": "Claude",
    "category": "AI Tool",
    "tags": ["chat", "notes"],
    "screenshotUrls": ["https://example.com/1.png"],
    "videoUrl": "https://youtube.com/watch?v=abc",
    "customHtml": "<section>...</section>"
  }'
```

**Success:** `201` on first listing, `200` on update. Both return the listing
with `status` and a one-line `next`.

- A repeat call **merges**: only the fields you send change.
- `""` clears a field and `[]` clears a list.
- A single-field update is fine and a retry is safe. There is no separate edit
  endpoint.

**Approval:**

| Where | Result |
| --- | --- |
| Public gallery (no `collectionSlug`) | Live at once. |
| Event page, no code | `status: "pending"`. Appears once the organiser approves. |
| Event page, with the right `code` on the first submission | `"approved"` at once. |
| Event page, wrong code | Not an error. It just waits for approval. |
| Rejected | `"rejected"`, with the organiser's reason in `next`. Fix it and call again, with the code if you now have it. |

**After it's live, follow `next`.** It asks you to help the user promote the
app: short posts for each platform about what they built, who it helps and why
to try it. If there is no video yet, it asks you to suggest a short demo.
Qualifying approved videos get a year of Embarko Pro for that app.

**Errors:**

| Code | Status | Retry | Meaning |
| --- | --- | --- | --- |
| `SHOWCASE_COLLECTION_UNKNOWN` | 404 | No | Bad slug. |
| `SHOWCASE_COLLECTION_PRIVATE` | 403 | No | Another company's page. |

---

## [Request a deploy token](#token-request)

**`POST https://ship.embarko.ai/api/public/deploy-tokens/request`** · sync ·
**not safe to repeat**

**Auth:** none. **Required body:** `{"email": "..."}`.

1. **Check first:** look in `$DEPLOY_TOKEN` and `~/.embarko/credentials`. If
   the user already has a token, don't request one.
2. **Call it once.** Never loop.
3. **Ask the user to paste the token.** It is emailed to that address and is
   never in the response. You cannot read it back, print it, or receive it.

**Good to know:**

- **Always returns `202`**, whether or not the address exists and whether or
  not you hit a rate limit.
- A new address gets an account and company created automatically.
- **Limits:** 5/hour per email, 10/hour per IP. The response is the same
  either way, so a retry tells you nothing.

---

## [Send feedback as an agent](#feedback)

**`POST https://ship.embarko.ai/apps/<app-name>/customer-query`** · sync

**Auth:** same rule as status. None while unclaimed, token once claimed.

**Required:** header `X-Agent-Name` (free text), body `type` and `message`
(1–5000 chars).

`type` says what kind of problem it was:

| `type` | Use it when |
| --- | --- |
| `platform_bug` | Embarko itself misbehaved |
| `missing_capability` | the app needs something Embarko doesn't have |
| `docs_issue` | the docs were wrong or unclear |
| `unexpected_behavior` | it worked, but not the way the docs say |
| `other` | anything else |

`feature` and `feedback` are still accepted too.

**Errors:**

| Code | Status | Retry | Meaning |
| --- | --- | --- | --- |
| (missing header) | 400 | No | `X-Agent-Name` is missing. |
| `invalid_feedback_type` | 400 | No | Unknown `type`. |
| (transient) | 502 | Once | Retry once. |

**No app yet?** Use `POST /api/public/customer-query` with an `email` in the
body. It needs no auth and is rate limited to 10/email, 20/IP and 500/hour
globally.

---

## [Read the capability manifest](#capabilities-endpoint)

**`GET https://ship.embarko.ai/capabilities`** · sync · safe · no auth

A contents page: one line per topic, saying what it covers and where to read
it. Open only the topic you need.

```json
{
  "version": "2026-09-29",
  "about": "What Embarko can and can't do. Open the topic you need; each one answers fully on its own.",
  "topics": [
    { "topic": "deploy", "covers": "Uploading an app, what it needs to run here, and waiting for it to go live", "url": "https://ship.embarko.ai/capabilities/deploy" },
    { "topic": "custom-domain", "covers": "Using your own domain for an app, including the DNS step a person has to do", "url": "https://ship.embarko.ai/capabilities/custom-domain" }
  ],
  "links": { "all": "https://ship.embarko.ai/capabilities/all", "docs": "https://embarko.ai/docs/capabilities" }
}
```

**`GET https://ship.embarko.ai/capabilities/<topic>`** answers one question in
full:

| Field | Holds |
| --- | --- |
| `available` | Whether it is supported. |
| `who` | Who can do it: `agent`, `dashboard`. |
| `needsHuman` | A person has to do a step. |
| `summary` | A short answer. |
| `how` | The steps. |
| `limits` | The limits. |
| `next` | One next step. |
| `links` | Every URL. |

- **Topics:** `deploy`, `static-sites`, `claim`, `files`, `env-vars`,
  `custom-domain`, `logs`, `rollback`, `scale-to-zero`, `showcase`, `feedback`
  and `not-supported`.
- Common other names work too (`domains`, `database`, `secrets`, `cron`…).
- `?feature=<topic>` on the contents URL does the same thing.
- An unknown topic is `404` `unknown_topic` with the list of topics.

**`GET https://ship.embarko.ai/capabilities/all`** returns the whole contract
at once.

All three need no token and are cached for an hour (with an `ETag`). **Read
the topic before relying on a feature.** It wins over any prose page,
including this one.

---

## [Manage a live app](#manage)

All on the deploy host under `/api/apps/<name>`, all with a deploy token.

| Action | Call | Notes |
| --- | --- | --- |
| Register a custom domain | `POST /api/apps/<name>/domains` `{"domain": "..."}` | Returns the DNS record to create. `400 domain_reserved` for Embarko's own addresses (`*.embarko.app`). `409 domain_taken` if another app has it. |
| List domains | `GET /api/apps/<name>/domains` | |
| Verify a domain | `POST /api/apps/<name>/domains/<domain>/verify` | Safe to repeat while DNS propagates. |
| Remove a domain | `DELETE /api/apps/<name>/domains/<domain>` | Never affects the default URL. |
| Analytics | `GET /api/apps/<name>/analytics?range=7d` | `24h`/`7d`/`30d`/`90d`/`all`, default `24h`. |
| Rename (display name) | `PATCH /api/apps/<name>` `{"name": "My App"}` | Slug and URL never change. |
| Change the web address | `POST /api/apps/<name>/slug-change` `{"newName": "..."}` | Changes the URL. Ask the user first. See [above](#change-address). |
| Delete the app | `DELETE /api/apps/<name>` `{"confirmAppName": "<name>"}` | Irreversible, no backup. |

**Good to know:**

- **You cannot create the DNS record.** Register and verify are yours. The
  record lives in the user's registrar account. Hand them what `POST /domains`
  returns and wait.
- **Analytics `503` means the subsystem is unreachable.** It is not zero
  traffic. Do not report it as such.
- **Rename changes the display name only.** `PATCH` does not move the slug
  (the URL). Moving the URL is [change the web address](#change-address), a
  much heavier call. It takes the app offline for minutes and kills the old
  address.
- **Delete requires `confirmAppName` in the body.** Missing or wrong is
  `400 confirmation_required` and deletes nothing. Get the user's explicit
  go-ahead first. See [escalation](escalation.md#destructive).
- **Memory can't be changed.** There is no agent call and no dashboard
  control. Reduce the app's footprint instead.

---

## [Related](#related)

- [Capabilities](capabilities.md): the same surface by feature, with limits.
- [Troubleshooting](troubleshoot.md): every error code and its fix.
- [Overview](overview.md): what Embarko is and when to choose it.
