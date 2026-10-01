# API contract

The operating contract for an agent running an app on Embarko without a
human watching. Every action below states its method, auth, parameters,
response shape, states, errors, what is retryable, and what happens if you
call it twice.

Read [How to behave](#how-to-behave) first — it is the part that prevents
the expensive mistakes. The per-action reference follows.

## [How to behave](#how-to-behave)

### [Identity: what names an app](#identity)

**`X-App-Name` is the app's identity.** It is also its public subdomain, so
it is unique across the whole platform — not per company. There is no
separate project id to track, and no create-then-deploy sequence: the first
deploy of a name creates the app, and every later deploy of the same name
updates it.

Two rules follow, and they are the ones agents get wrong:

- **To update an app, deploy the same name again.** Do not invent
  `my-app-2`. A redeploy of a name you own returns `2xx` and replaces the
  running app in place, keeping its env vars, its domains and its
  `DATA_DIR` data.
- **`409 app_name_taken` means the name belongs to a *different company*.**
  It is not "your app already exists" — that case is a normal successful
  redeploy, not an error. You cannot update someone else's app, so the only
  correct response is to pick a different name. Do not retry the same one.
  The exception: if it is an unclaimed anonymous app that *you* just
  deployed, redeploying it with a token claims it.

Store the app name you used. It is the only handle you need for status,
logs, env vars, history, rollback and showcase.

### [Two hosts, two auth models](#auth-model)

Everything is on `ship.embarko.ai`. **The path prefix does not tell you the
auth rule** — group by what the call needs, not by where it lives:

| Auth | Calls |
| --- | --- |
| **None, ever** | `GET /capabilities`; `POST /api/public/deploy-tokens/request`; `POST /api/public/customer-query` (rate limited) |
| **None while the app is an unclaimed anonymous deploy; the owning company's token once claimed** | `POST /apps` (deploy); `GET /apps/<name>/status`; `GET /apps/<name>/logs`; `POST /apps/<name>/customer-query` |
| **Deploy token, always** | `/apps/<name>/domains…`; `GET /apps/<name>/analytics`; `PATCH /apps/<name>` (rename); `DELETE /apps/<name>`; and everything under `/api/apps/<name>/…` — env vars, deployments, rollback, showcase, slug-change |

Note the two path shapes on the same host: deploy, status, logs, domains,
analytics, rename and delete sit directly under `/apps/<name>`, while env
vars, deployment history, rollback, showcase and slug-change sit under
`/api/apps/<name>`. There is no rule to infer — copy the path from the
action's own section below.

The token is `Authorization: Bearer <token>`, is company-wide rather than
per-app, and deploys only — it does not sign in to the dashboard.

**An absent header and a bad header are different things.** Omitting
`Authorization` entirely is a valid anonymous deploy. Sending a present but
invalid token is always a hard `401` and is never silently downgraded to
anonymous.

**On the deploy host, a claimed app answers `404`, not `401`, to a caller
without the right token** — it will not confirm that an app exists to
someone who doesn't own it. So `404` on status or logs means "not yours, or
not found", never "definitely does not exist".

### [The error envelope](#error-envelope)

Every non-2xx response carries both fields:

```json
{ "error": "Human-readable sentence that may change wording", "code": "machine_readable_code" }
```

**Branch on `code`. Never parse `error`.** Some responses add fields that
name the fix — `details`, `detail`, `foundNestedAt`, `deployThisInstead`,
`retainCount`. Read them before deciding what to do; several errors tell you
exactly what to change.

Additional fields may appear in any response over time. Branch only on the
fields named in this document and ignore the rest, rather than failing on an
unexpected key.

### [Retry policy](#retry-policy)

Retrying a permanent error is the most common way an autonomous agent burns
a rate limit and achieves nothing. The rule is the status class, with two
exceptions:

| Status | Retryable? | What to do |
| --- | --- | --- |
| `400`, `401`, `403`, `404`, `409`, `422` | **No** | The request itself is wrong. Fix the cause named by `code`, then send a *different* request. |
| `502 app_name_check_failed` | **Yes** | Transient internal check. Retry the identical request once, then back off. |
| `429` | **Yes, slowly** | Rate limited. Back off; do not loop. |
| `500`, `502`, `503`, `504` (others) | **Once** | Retry once after a pause. If it repeats, stop and report — a deploy may still have been accepted, so check status before re-uploading. |
| Network timeout on `POST /apps` | **Check first** | The upload may have landed. Call status before retrying, or you will deploy twice. |

Backoff: wait 2s, then 5s, then 15s. Three attempts total, then stop and
tell the user. Never retry in a tight loop, and never retry a `4xx`.

Rate-limited endpoints return the **same response whether or not you hit the
limit**, so a retry cannot tell you it worked. Treat one call as your only
call.

### [Idempotency](#idempotency)

Nothing here takes an idempotency key. What each call does when repeated:

| Action | Repeating it |
| --- | --- |
| `POST /apps` | **Not idempotent.** Each call is a new deploy and a new history entry. Same name = update in place, so it is *safe* but not free. Check status before retrying a timeout. |
| `GET` anything | Safe, always. |
| `PUT /env-vars/<key>` | Idempotent. Same value, same result. |
| `DELETE /env-vars/<key>` | Idempotent in effect. |
| `POST /env-vars/apply` | Safe to repeat; re-applies current values. |
| `POST .../rollback` | **Not idempotent.** Each call creates a new deployment entry. Repeating it with the same target is harmless but noisy. |
| `PUT /showcase` | Idempotent. Second call updates the listing rather than erroring. |
| `POST /deploy-tokens/request` | **Emails a token each time.** Rate limited. Call once. |

### [Async behaviour and states](#async)

Two actions are asynchronous. Both answer immediately with `202` and finish
in the background:

- **Deploy** (`POST /apps`) — poll `links.status`.
- **Rollback** — poll the returned deployment.

`202` means *accepted*, never *live*. Reporting a URL on the `202` is the
single most common autonomous failure.

States, from `GET .../status` (the `status` field):

```
building / publishing ──▶ starting ──▶ live     → report the URL, then do what `next` says
                      └─▶ failed               → read links.logs, fix, redeploy
                                  └─▶ crashed  → built, but stops on start: read links.logs
```

`publishing` is a static site (no build, live in seconds). Two more values
can appear: `not_deployed` (nothing under this name) and `unknown` (no record
of a recent deploy — the service may have restarted; if the URL responds, the
app is live).

Poll every 10 seconds for a server app. A static site usually needs no
polling at all: its deploy reply is already `live`. If it came back
`publishing` (a very large site), poll every 2 seconds. Give up after 10 minutes and read the logs.

### [How every reply is shaped](#reply-shape)

`POST /apps`, `GET .../status` and `GET .../logs` all answer with the same
four fields:

| Field | What it holds |
| --- | --- |
| `status` | Where things stand, in one word. |
| `app` | Only the facts the next step needs: `name`, `kind` (`service` or `static`), `claimed`, and `expiresAt` while the app is temporary. No URLs. |
| `next` | **One** short sentence: what to do now. Follow it. Later steps (claiming, the showcase) appear in later replies, once they apply. When a step needs more than a sentence, `links.help` points to the [capabilities topic](#capabilities-endpoint) with the full steps. |
| `links` | **Every URL in the reply, and only here**: the ones `next` refers to, plus `feedback`. The app's own address is `links.app`, present once the app is live. `next` names them (`links.status`) rather than repeating the URL. |

Errors keep `error` and `code` (branch on `code`) and add `next` and
`links` too. `links.feedback` is on every reply: when something fails or
is confusing, report it there.

Use the links the reply gives you rather than building them from the app
name. If the address format ever changes, a caller that used them keeps
working.

---

## [Deploy or redeploy an app](#deploy)

**`POST https://ship.embarko.ai/apps`** · async · not idempotent

**Auth:** optional. Omit `Authorization` for an anonymous deploy; send
`Bearer <token>` to create or update an app owned by your company, and to
claim an anonymous one.

**Required:**

| Where | Name | Rules |
| --- | --- | --- |
| header | `X-App-Name` | `^[a-z0-9-]+$`, 3–63 chars, no leading or trailing dash, unique platform-wide. Also the subdomain. |
| multipart field | `source` | `.tar.gz` of the app's source, manifest at the archive root. |

Or send the source as JSON instead of a file — see [JSON source](#deploy) below.

**Optional:**

| Where | Name | Default | Notes |
| --- | --- | --- | --- |
| header | `Authorization` | none (anonymous) | `Bearer <token>` |
| header | `X-App-Version` | a timestamp | `^[a-zA-Z0-9._-]+$`. Pass a git SHA or tag. Never reuse a tag for different code. |
| header | `X-App-Type` | none | What the app is for, as a short plain-text label: e.g. `personal website`, `portfolio`, `landing page`, `blog`, `task management`, `feedback system`, `dashboard`, `e-commerce store`. Printable ASCII, at most 60 characters. See **App type** below. |
| header | `X-Agent-Name` | none | Which agent is deploying, in lowercase: `claude-code`, `claude`, `chatgpt`, `codex`, `cursor`, `copilot`, `gemini`, and so on. Printable ASCII, at most 60 characters. See **Agent name** below. |

**Example request:**

```bash
tar -czf /tmp/my-app.tar.gz --exclude=node_modules --exclude=.git \
  --exclude='.env*' -C /path/to/app .

curl -X POST "https://ship.embarko.ai/apps" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" \
  -H "X-App-Name: my-app" \
  -H "X-App-Version: $(git rev-parse --short HEAD)" \
  -H "X-App-Type: portfolio" \
  -H "X-Agent-Name: claude" \
  -F "source=@/tmp/my-app.tar.gz"
```

**App type (`X-App-Type`).** Optional, but send it
whenever you can. It says what the app is for, in plain words. Use the label
that fits best: one from the examples above, or your own short phrase if none
fits. To choose it:

1. If what the app does is already clear, from what you built or from what the
   user said, use that and don't ask.
2. If it isn't clear, ask the user once, when you confirm the app name:
   *"What kind of app is this (for example a personal website, portfolio, task
   manager or feedback system)? You can skip this."*
3. If the user skips the question, leave the header out. The deploy works
   without it.

You only need to send it once. A redeploy without the header keeps the
earlier value, and a redeploy with a new value replaces it. It doesn't change
how the app is built or run.

**Agent name (`X-Agent-Name`).** Optional, but always send it. It is the name
of the agent or product you are running as. The app's deploy history shows
it, so the owner can see which agent deployed what. It is only a label: it
doesn't change what you can do, and nothing checks it. Send the same value on
[rollback](#rollback) and on [env var](#env-vars) writes and applies, which
also create deploy history entries.

**Sending the source as JSON instead.** If you can't upload a file — for
example you're calling this through an MCP tool, or from a sandbox that
can't make outbound requests — send the source as JSON with
`Content-Type: application/json`. Everything else (auth, response, errors,
build) is identical to the multipart upload.

| Field | Required | Notes |
| --- | --- | --- |
| `appName` | Yes (or `X-App-Name` header) | Same rules as `X-App-Name`. A header wins if both are sent. |
| `files` | Yes | Array of `{ "path", "content", "encoding"? }`. `path` is relative to the app root (manifest at the root). `encoding` is `"utf8"` (default) or `"base64"` for binary files. |
| `version` | No | Same as `X-App-Version`. |
| `appType` | No | Same as `X-App-Type`. |
| `agentName` | No | Same as `X-Agent-Name`. |

Limits: 25 MB body, 2000 files. Leave out `node_modules`, build output,
`.git` and `.env*` — the platform installs and builds for you. Send text
files as plain text; use base64 only for binaries. For bigger apps, use the
multipart upload.

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

**Success — `202 Accepted`** (a server app, deployed without a token):

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

**A static site** (an `index.html` and assets, nothing to build) is
published while the request waits, so the reply is the result. It is
**`200 OK`** with `status: "live"`, `app.kind: "static"`, and the same
`next` and `links` as a live status reply: the claim step with `links.help`
→ `capabilities/claim` while the app is temporary, or the showcase step once
it's claimed. The wait is capped at 5 seconds; a site that takes longer gets
`202` with `status: "publishing"` and `next` says to check `links.status`.
If publishing fails, the reply is `500` with `success: false`,
`code: "publish_failed"` and `status: "failed"`.

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

**With a token**, `app.claimed` is `true` and there is no `expiresAt`. When
the redeploy claims a temporary app, `next` starts with "Claimed: this app is
now permanent".

**When a server app is replaced by a static site**, `next` starts with a
warning: its server is removed and it can't be turned back into a server
app.

`app.expiresAt` is the exact deletion time of a temporary app. Give the user
that, not a vague "24 hours". There is no reminder email.

**Failure — `409`:**

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

Before the app exists (a rejected name, a bad token), `links.feedback` is
the public feedback address, which takes the user's `email` in the body.

**Errors:**

| Code | Status | Retry | Meaning and action |
| --- | --- | --- | --- |
| `invalid_app_name` | 400 | No | Missing, or fails the pattern. Slugify and resend. |
| `invalid_app_version` | 400 | No | Fails `^[a-zA-Z0-9._-]+$`. |
| `invalid_app_type` | 400 | No | `X-App-Type` is longer than 60 characters or contains non-printable or non-ASCII characters. Shorten it, or leave it out. |
| `invalid_agent_name` | 400 | No | `X-Agent-Name` is longer than 60 characters or contains non-printable or non-ASCII characters. Use a plain name like `claude`, or leave it out. |
| `missing_source_file` | 400 | No | No `source` in the multipart body, or no non-empty `files` array in a JSON body. |
| `invalid_file_path` | 400 | No | JSON body only. A `files[].path` is absolute or contains `..`. Use paths relative to the app root. |
| `invalid_file_content` | 400 | No | JSON body only. A `files[].content` isn't a string. |
| `invalid_file_encoding` | 400 | No | JSON body only. `encoding` must be `utf8` or `base64`. |
| `invalid_json` | 400 | No | JSON body doesn't parse. |
| `source_too_large` | 413 | No | JSON body over 25 MB. Use the multipart upload. |
| `too_many_files` | 413 | No | Over 2000 files in a JSON body. Drop `node_modules`/build output, or use the multipart upload. |
| `unauthorized` | 401 | No | Token present but invalid or revoked. Omitting it entirely is anonymous, not an error. |
| `app_name_taken` | 409 | No | **Another company owns this name.** Pick a different one. Never retry. |
| `unsupported_storage_pattern` | 422 | No | App calls `window.storage`. Replace with SQLite under `DATA_DIR`. |
| `no_manifest_at_root` | 422 | No | Manifest is nested. Read `foundNestedAt`, repackage from that folder. |
| `app_nested_in_subdirectory` | 422 | No | Root delegates the build to a subfolder. Deploy the folder named in `deployThisInstead`. One deploy is one app. |
| `invalid_static_root` | 422 | No | The Staticfile's `root` points outside the upload. Point it at a folder inside it. |
| `app_kind_changed` | 422 | No | The app is a static site and this upload is a server app. A static site can't become one: deploy under a new app name. |
| `rename_in_progress` | 409 | Yes, later | The app's web address is being changed. Wait, then deploy under its new name. |
| `app_name_check_failed` | 502 | **Yes** | Transient. Retry the identical request. |
| `deploy_failed` | 500 | Once | Build or schedule step failed. Read `details`. |
| `publish_failed` | 500 | Once | A static site's files couldn't be published. Redeploy once; if it fails again, report it to `links.feedback`. |

**After a `202`:** poll `links.status` until `status` is `live` (or
`failed` / `crashed`). Report the URL only on `live`.

---

## [Check deploy status](#status)

**`GET https://ship.embarko.ai/apps/<app-name>/status`** · sync · safe

**Auth:** none while the app is an unclaimed anonymous deploy; the owning
company's token once claimed.

**Parameters:** none beyond the app name in the path.

**Live, not claimed yet — `200`.** This is the reply that brings up claiming:

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

**Live and claimed — `200`.** This is the reply that brings up the showcase:

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

**Failed — `200`.** `error` names the cause and `links.logs` points at stderr:

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

**States:** `status` is one of `building`, `publishing`, `starting`, `live`,
`failed`, `crashed`, `not_deployed`, `unknown` — see
[Async behaviour and states](#async). A sleeping app (scale-to-zero) reads
`live`; `next` says it wakes on the first request.

**Static sites** have no server, so `live` means the files are published —
there is no separate health check. `next` never mentions logs for them.

**Deprecated field.** `deploy.status` (`in_progress`, `success`, `failed`,
`unknown`) is kept for older copies of the deploy script. Read `status`
instead; `deploy` will be removed.

**Errors:** `404` `not_found` — not yours, or no such app. Check the name
and the token. `401` `unauthorized` — the token was rejected. Both carry
`next` and `links.feedback`. The status reflects the most recent attempt held
in memory, not durable history — use [deployment history](#history) for that.

---

## [Read logs](#logs)

**`GET https://ship.embarko.ai/apps/<app-name>/logs`** · sync · safe

**Auth:** same rule as status.

**Optional:** `?stream=stderr` (default `stdout`).

**Success — `200`:**

```json
{
  "available": true,
  "allocId": "b457e652-...",
  "stream": "stdout",
  "logs": "...tail of recent output..."
}
```

When the latest build failed, the response carries the **build** output
instead, with `source: "build"` and a `next` saying the cause is in there.
That is where the failing command is named. This includes a failed redeploy
while the previous version is still running.

**Static site — `200`.** Nothing runs on the server, so there are no logs:

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

**Nothing deployed yet — `200`:**

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

**Behaviour:** a snapshot at call time, not a stream. Poll to follow along.
Always the most recent allocation, healthy or not. No retention guarantee.

---

## [List deployment history](#history)

**`GET https://ship.embarko.ai/api/apps/<app-name>/deployments`** · sync · safe

**Auth:** deploy token, always.

**Returns:** the app's deployments, newest first. Each entry carries at
least an **id**, a **status**, and the **version** deployed. Use the id for
`GET /deployments/<id>` and for rollback. Only entries whose status is
`success` are valid rollback targets.

Each entry also says who made it:

| Field | Values |
| --- | --- |
| `source` | `"dashboard"` (a person in the dashboard) or `"agent"` (anything using a deploy token: an AI agent, CI or a script). `null` on some very old entries. |
| `agentName` | Whatever `X-Agent-Name` the deploy sent, or `null`. |
| `triggeredBy` | The dashboard user, or the deploy token's label. |

**`GET .../deployments/<id>`** returns one entry — this is also how you poll
a rollback to completion.

**Errors:** `401` invalid token (not retryable); `404` unknown app or not
yours.

---

## [Roll back to an earlier deployment](#rollback)

**`POST https://ship.embarko.ai/api/apps/<app-name>/deployments/<deploymentId>/rollback`**
· async · not idempotent

**Auth:** deploy token, always.

**Required:** `deploymentId` in the path — **this is what chooses the
version.** Read the history first; do not assume rollback steps back one.

**Example:**

```bash
curl "https://ship.embarko.ai/api/apps/my-app/deployments" \
  -H "Authorization: Bearer $DEPLOY_TOKEN"

curl -X POST \
  "https://ship.embarko.ai/api/apps/my-app/deployments/<deploymentId>/rollback" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" \
  -H "X-Agent-Name: claude"
```

**Success — `202 Accepted`**, carrying the new deployment and a `statusUrl`.
Rollback creates a **new** history entry pointing at the old image; history
is never rewritten. Poll until its status leaves `in_progress`.

**Failure — `422`:**

```json
{ "error": "Cannot roll back: the image is no longer available...", "code": "rollback_image_unavailable", "retainCount": 5 }
```

**Errors:**

| Code / shape | Status | Retry | Action |
| --- | --- | --- | --- |
| `rollback_image_unavailable` | 422 | No | Image pruned. `retainCount` says how far back you can reach — pick a newer target, or redeploy the old source. |
| other `422` | 422 | No | Target never succeeded, or has no image. Pick a different deployment. |
| `unauthorized` | 401 | No | Bad token. |
| — | 404 | No | Unknown app or deployment, or not yours. |

**Behaviour:** no rebuild — it reruns an existing image under **current**
configuration (today's env vars and domains, not those of the original
deploy).

---

## [Change an app's web address](#change-address)

**`POST https://ship.embarko.ai/api/apps/<app-name>/slug-change`**
· async · not idempotent

**Auth:** deploy token, always.

**Required:** `newName` in the body.

Distinct from `PATCH /apps/<name>`, which changes the display name and
leaves the URL alone. This changes the URL itself.

**Ask the user first.** The old address stops working the moment the new
one is live — there is no redirect, anything linking to it breaks, and the
freed name can be claimed by someone else. See
[escalation](escalation.md#destructive).

**Example:**

```bash
curl -X POST "https://ship.embarko.ai/api/apps/my-app/slug-change"   -H "Authorization: Bearer $DEPLOY_TOKEN"   -H "Content-Type: application/json"   -d '{"newName": "my-better-app"}'
```

**Success — `202 Accepted`** for a live app, carrying `statusUrl`,
`appUrl`, and `deployWith` (the `X-App-Name` to use from now on). An app
that has never deployed answers `200` with `terminal: true` — that one is a
single database write and is already done.

**Poll** `GET https://ship.embarko.ai/api/slug-changes/<project-id>` until
`terminal` is true. `state` ends `succeeded` or `failed`, and `currentSlug`
always says where the app actually is. A failed migration leaves the app on
its old address, untouched.

**Errors:**

| Code / shape | Status | Retry | Action |
| --- | --- | --- | --- |
| `invalid_app_name`, `app_name_too_short`, `app_name_too_long` | 400 | No | Same rules as `X-App-Name`: `^[a-z0-9-]+$`, 3–63 characters, no leading or trailing hyphen. |
| `app_name_reserved` | 409 | No | Platform-reserved name. Pick another. |
| `app_name_taken` | 409 | No | Held platform-wide, not just in your company. |
| `deploy_in_progress` | 409 | Yes | Wait for the deploy to finish. |
| `rename_in_progress` | 409 | Yes | One is already running for this app. |
| `no_current_deployment` | 409 | No | Running but no record of which image is live. Deploy once, then retry. |
| `slug_change_cooldown` | 429 | Later | One change per app per week. `retryAfterMs` says when. |
| `app_state_unknown` | 503 | Yes | Couldn't confirm whether the app is running. Fails closed. |
| `rename_failed` | 502 | Yes | The migration was refused or rolled back; the app is untouched. |
| `rename_desynced` | 500 | No | The app moved but we couldn't record it. Needs a person. |

**Behaviour:** for a live app this is slow — minutes, not seconds — because
the app needs a fresh HTTPS certificate for the new hostname. It is stopped
while its stored data is moved, and it keeps that data.

**Afterwards, deploy with the new name.** If something still calls the old
one it gets `404 app_renamed`, carrying `newName` and a `retryUrl` — follow
that rather than deploying a fresh app under the old name, which would
create a second, empty app.

**Not affected:** a custom domain is carried over and keeps working
throughout, so an app that has one does not change its real address. A
Showcase listing follows the rename: its page moves to
`/showcase/app/<new-name>`.

---

## [Environment variables](#env-vars)

Base: `https://ship.embarko.ai/api/apps/<app-name>/env-vars`. **Deploy token
always.**

| Operation | Method & path | Idempotent | Notes |
| --- | --- | --- | --- |
| List keys | `GET /env-vars` | yes | **Keys only — values are never returned.** |
| Replace all | `PUT /env-vars` | yes | Anything omitted is removed. |
| Set one | `PUT /env-vars/<key>` | yes | Body `{"value": "..."}`. |
| Delete one | `DELETE /env-vars/<key>` | yes | |
| Apply to running app | `POST /env-vars/apply` | yes | Required — see below. |

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

Applying creates a deploy history entry, so send `X-Agent-Name` on the apply
call and on any write with `"apply": true`. On these calls a malformed name is
ignored rather than rejected.

**The behaviour that catches agents:** a write only *stores* the value. The
running app does not see it until you call `POST /env-vars/apply` or deploy
again. Writing a key and reporting success without applying leaves the app
running on the old value.

**Values are write-only.** You cannot read a secret back — not with the
token, not ever. If you need to know a value, ask the user.

**Static sites have no env vars.** Nothing runs on the server to read them,
so setting or applying one on a static site (`app.kind: "static"`) is refused
with `409` `not_supported_for_static`. Put configuration in the site's files
instead, or deploy it as a server app under a new name. Listing and deleting
still work.

---

## [List on Showcase](#showcase)

**`PUT https://ship.embarko.ai/api/apps/<app-name>/showcase`** · sync ·
idempotent

**Auth:** deploy token.

**Fill the details from the project.** Infer what you can from the code,
README and live app — name, tagline, what it does, the AI that built it, a
category and tags. Ask the user for the rest: who they are, a profile link,
a contact email, and anything you can't tell. Never send placeholder text —
listing publishes at once.

**Body:**

| Field | Required | What to send |
| --- | --- | --- |
| `collectionSlug` | | The Showcase page to list on, e.g. `"walkover"`. Empty is the public gallery. |
| `code` | | The event's code, if the user has one. Skips the organiser's review. |
| `name` | first listing | The app's name. Up to 80 characters. |
| `tagline` | first listing | One line about it. Up to 160 characters. |
| `description` | | What it does — a short paragraph. |
| `story` | | Why it was built — a short paragraph. |
| `creatorName` | first listing | Who built it. Up to 80 characters. |
| `creatorProfile` | | A link to the creator's profile, if they have one. |
| `contactEmail` | | Adds a "Contact Dev" button to the page. Visitors never see the address. |
| `builtWith` | | The AI that built it: `Claude`, `Codex`, `Cursor`, `Lovable`, `Replit` or `Other`. |
| `category` | | One of `AI Tool`, `Personal`, `Business`, `Productivity`, `Education`, `Game`, `Developer Tool`, `Other`. |
| `tags` | | A few short tags, as an array. Up to 20. |
| `screenshotUrls` | | Public image URLs of the app's main screens, as an array. Without one the app doesn't show on the page. |
| `videoUrl` | | A video of the app, if there is one. |
| `customHtml` | | Your own HTML section for the listing page. |
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
    "contactEmail": "jane@example.com",
    "builtWith": "Claude",
    "category": "AI Tool",
    "tags": ["chat", "notes"],
    "screenshotUrls": ["https://example.com/1.png"],
    "videoUrl": "https://youtube.com/watch?v=abc",
    "customHtml": "<section>...</section>"
  }'
```

**Success:** `201` on first listing, `200` on update — both return the
listing with `status` and a one-line `next`. Calling it again **merges**: only the
fields you send change (`""` clears one), so a single-field update is fine.
There is no separate edit endpoint.

**Approval:** an empty `collectionSlug` is the public gallery, live at once.
An event page needs the organiser's approval: the listing comes back
`status: "pending"` and appears on the page once approved. Send the event's
`code` (the organiser hands it out) and it is `"approved"` at once. A wrong
code is not an error — it just waits. `"rejected"` carries the organiser's
reason in `next`; fix that and call again.

**Errors:** `404 SHOWCASE_COLLECTION_UNKNOWN` (bad slug),
`403 SHOWCASE_COLLECTION_PRIVATE` (another company's page). Neither is
retryable.

---

## [Request a deploy token](#token-request)

**`POST https://ship.embarko.ai/api/public/deploy-tokens/request`** · sync ·
**not safe to repeat**

**Auth:** none. **Required body:** `{"email": "..."}`.

**Always returns `202`**, whether or not the address exists and whether or
not you hit a rate limit. An account and company are created automatically
for a new address.

**The token is emailed to that address and is never in the response.** You
cannot read it back, print it, or receive it — ask the user to paste it.

**Limits:** 5/hour per email, 10/hour per IP. Because the response is
identical either way, **call it once** and never loop.

**Before calling it at all:** check `$DEPLOY_TOKEN` and
`~/.embarko/credentials`. Requesting a token the user already has is a
wasted round trip through their inbox.

---

## [Send feedback as an agent](#feedback)

**`POST https://ship.embarko.ai/apps/<app-name>/customer-query`** · sync

**Auth:** same rule as status — none while unclaimed, token once claimed.

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

**Errors:** `400` if `X-Agent-Name` is missing, or `invalid_feedback_type`
for an unknown `type` (not retryable); `502` transient (retry once).

The anonymous equivalent is `POST /api/public/customer-query` with an
`email` in the body, rate limited to 10/email, 20/IP and 500/hour globally.

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

**`GET https://ship.embarko.ai/capabilities/<topic>`** answers one question
in full: `available`, `who` can do it (`agent`, `dashboard`), `needsHuman`
if a person has to do a step, `summary`, `how` (the steps), `limits`, one
`next`, and every URL under `links`. Topics: `deploy`, `static-sites`, `claim`, `files`, `env-vars`, `custom-domain`, `logs`, `rollback`, `scale-to-zero`, `showcase`, `feedback` and `not-supported`. Common
other names work too (`domains`, `database`, `secrets`, `cron`…), and
`?feature=<topic>` on the contents URL is the same thing. An unknown topic is
`404` `unknown_topic` with the list of topics.

**`GET https://ship.embarko.ai/capabilities/all`** is the whole contract at
once, for anyone who wants every field in one go.

All three need no token and are cached for an hour (with an `ETag`).
**Read the topic before relying on a feature.** It wins over any prose page,
including this one.

---

## [Manage a live app](#manage)

All on the deploy host, all with a deploy token.

| Action | Call | Notes |
| --- | --- | --- |
| Register a custom domain | `POST /apps/<name>/domains` `{"domain": "..."}` | Returns the DNS record to create |
| List domains | `GET /apps/<name>/domains` | |
| Verify a domain | `POST /apps/<name>/domains/<domain>/verify` | Safe to repeat while DNS propagates |
| Remove a domain | `DELETE /apps/<name>/domains/<domain>` | Never affects the default URL |
| Analytics | `GET /apps/<name>/analytics?range=7d` | `24h`/`7d`/`30d`/`90d`/`all`, default `24h` |
| Rename (display name) | `PATCH /apps/<name>` `{"name": "My App"}` | Slug and URL never change |
| Change the web address | `POST /api/apps/<name>/slug-change` `{"newName": "..."}` | Changes the URL. Ask the user first — see [above](#change-address) |
| Delete the app | `DELETE /apps/<name>` `{"confirmAppName": "<name>"}` | Irreversible, no backup |

Four behaviours worth stating outright:

- **You cannot create the DNS record.** Register and verify are yours;
  the record itself lives in the user's registrar account. Hand them what
  `POST /domains` returns and wait.
- **Analytics returns `503` when the subsystem is unreachable.** That is
  not zero traffic — do not report it as such.
- **Rename changes the display name only.** The slug is the URL and
  `PATCH` does not move it. Moving the URL is a different, much heavier
  call — [change the web address](#change-address) — which takes the app
  offline for minutes and kills the old address.
- **Delete requires `confirmAppName` in the body.** Omitting it or getting
  it wrong is `400 confirmation_required` and deletes nothing. Get the
  user's explicit go-ahead before sending it — see
  [escalation](escalation.md#destructive).

The only thing with no API at all is **changing memory**: no agent call, and
the dashboard control has been removed. Reduce the app's footprint instead.

---

## [Related](#related)

- [Capabilities](capabilities.md) — the same surface by feature, with limits.
- [Troubleshooting](troubleshoot.md) — every error code and its fix.
- [Overview](overview.md) — what Embarko is and when to choose it.
