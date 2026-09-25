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
| **Deploy token, always** | `/apps/<name>/domains…`; `GET /apps/<name>/analytics`; `PATCH /apps/<name>` (rename); `DELETE /apps/<name>`; and everything under `/api/apps/<name>/…` — env vars, deployments, rollback, showcase |

Note the two path shapes on the same host: deploy, status, logs, domains,
analytics, rename and delete sit directly under `/apps/<name>`, while env
vars, deployment history, rollback and showcase sit under
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

- **Deploy** (`POST /apps`) — poll `statusUrl`.
- **Rollback** — poll the returned deployment.

`202` means *accepted*, never *live*. Reporting a URL on the `202` is the
single most common autonomous failure.

Deploy states, from `GET .../status`:

```
in_progress  ──▶  success   → the app is live; report the URL now
             └─▶  failed    → read logs, fix, redeploy
```

There are no other values. `health` is a separate field describing the
running app right now, independent of the last deploy's outcome — an app can
be healthy while the newest deploy failed, because the previous version is
still serving.

Poll every 3–5 seconds. A normal build finishes in tens of seconds; give up
after 10 minutes and read the logs.

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

**Optional:**

| Where | Name | Default | Notes |
| --- | --- | --- | --- |
| header | `Authorization` | none (anonymous) | `Bearer <token>` |
| header | `X-App-Version` | a timestamp | `^[a-zA-Z0-9._-]+$`. Pass a git SHA or tag. Never reuse a tag for different code. |

**Example request:**

```bash
tar -czf /tmp/my-app.tar.gz --exclude=node_modules --exclude=.git \
  --exclude='.env*' -C /path/to/app .

curl -X POST "https://ship.embarko.ai/apps" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" \
  -H "X-App-Name: my-app" \
  -H "X-App-Version: $(git rev-parse --short HEAD)" \
  -F "source=@/tmp/my-app.tar.gz"
```

**Success — `202 Accepted`:**

```json
{
  "success": true,
  "accepted": true,
  "message": "Deployment accepted and is building in the background...",
  "version": "1788947902193",
  "image": "my-app:1788947902193",
  "memory": "256MB",
  "url": "https://my-app.embarko.app",
  "statusUrl": "https://ship.embarko.ai/apps/my-app/status",
  "logsUrl": "https://ship.embarko.ai/apps/my-app/logs"
}
```

**Use the URLs the response gives you.** `url`, `statusUrl` and `logsUrl`
are all returned — don't assemble them from the app name. If the address
format ever changes, a caller that used these keeps working and one that
guessed does not. `url` is also the live address to report to the user once
the deploy succeeds, so there is nothing to construct.

`version` is what was actually deployed — the value you sent, or the
timestamp the platform generated if you omitted `X-App-Version`. Record it;
it is how this deploy appears in [history](#history).

**Anonymous deploys** return every field above **plus an `orphan` object**:

```json
{
  "orphan": {
    "expiresAt": "2026-09-10T10:08:08.319Z",
    "message": "This app was deployed without a deploy token, so it is temporary and will be deleted at ... unless claimed.",
    "statusUrl": "https://ship.embarko.ai/apps/orphan-3/status",
    "logsUrl": "https://ship.embarko.ai/apps/orphan-3/logs"
  }
}
```

`orphan.expiresAt` is the exact deadline — give the user that, not a vague
"24 hours". It is the only warning they get; there is no reminder email.

**Failure — `409`:**

```json
{ "error": "App name 'my-app' is already in use by a different company", "code": "app_name_taken" }
```

**Errors:**

| Code | Status | Retry | Meaning and action |
| --- | --- | --- | --- |
| `invalid_app_name` | 400 | No | Missing, or fails the pattern. Slugify and resend. |
| `invalid_app_version` | 400 | No | Fails `^[a-zA-Z0-9._-]+$`. |
| `missing_source_file` | 400 | No | No `source` in the multipart body. |
| `unauthorized` | 401 | No | Token present but invalid or revoked. Omitting it entirely is anonymous, not an error. |
| `app_name_taken` | 409 | No | **Another company owns this name.** Pick a different one. Never retry. |
| `unsupported_storage_pattern` | 422 | No | App calls `window.storage`. Replace with SQLite under `DATA_DIR`. |
| `no_manifest_at_root` | 422 | No | Manifest is nested. Read `foundNestedAt`, repackage from that folder. |
| `app_nested_in_subdirectory` | 422 | No | Root delegates the build to a subfolder. Deploy the folder named in `deployThisInstead`. One deploy is one app. |
| `app_name_check_failed` | 502 | **Yes** | Transient. Retry the identical request. |
| `deploy_failed` | 500 | Once | Build or schedule step failed. Read `details`. |

**After a `202`:** poll `statusUrl` until `deploy.status` is no longer
`in_progress`. Report the live URL only on `success`.

---

## [Check deploy status](#status)

**`GET https://ship.embarko.ai/apps/<app-name>/status`** · sync · safe

**Auth:** none while the app is an unclaimed anonymous deploy; the owning
company's token once claimed.

**Parameters:** none beyond the app name in the path.

**Success — `200`:**

```json
{
  "appName": "my-app",
  "deploy": {
    "status": "success",
    "appVersion": "v1.2.0",
    "startedAt": "2026-09-09T10:00:00.000Z",
    "finishedAt": "2026-09-09T10:01:32.000Z",
    "errorDetail": null
  },
  "health": { "...": "current running state of the app" }
}
```

**States:** `deploy.status` is exactly one of `in_progress`, `success`,
`failed`. `errorDetail` is populated on `failed`.

**Errors:** `404` — not yours, or no such app. Not retryable; check the name
and the token. `deploy` reflects the most recent attempt held in memory, not
durable history — use [deployment history](#history) for that.

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

When the build failed and no container ever started, the response instead
carries the **build** output, with `source: "build"` and an explanatory
`note`. That is where the failing command is named.

**Nothing deployed yet — `200`:**

```json
{ "available": false, "reason": "No allocation has ever been created for this app yet" }
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
  -H "Authorization: Bearer $DEPLOY_TOKEN"
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
  -H "Authorization: Bearer $DEPLOY_TOKEN"
```

**The behaviour that catches agents:** a write only *stores* the value. The
running app does not see it until you call `POST /env-vars/apply` or deploy
again. Writing a key and reporting success without applying leaves the app
running on the old value.

**Values are write-only.** You cannot read a secret back — not with the
token, not ever. If you need to know a value, ask the user.

---

## [List on Showcase](#showcase)

**`PUT https://ship.embarko.ai/api/apps/<app-name>/showcase`** · sync ·
idempotent

**Auth:** deploy token.

**Required body fields:** `collectionSlug`, `name`, `tagline`,
`creatorName`. **Optional:** `whatItDoes`, `whyBuilt`, `builtWith`,
`category`, `tags`, `screenshotUrl`, `videoUrl`.

**Success:** `201` on first listing, `200` on update — both return the
listing, including its `/showcase/<slug>/<app-slug>` page. Calling it again
updates rather than erroring; there is no separate edit endpoint.

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

**Required:** header `X-Agent-Name` (free text), body `type` (exactly
`"feature"`, `"feedback"` or `"other"`) and `message` (1–5000 chars).

**Errors:** `400` if `X-Agent-Name` is missing (not retryable); `502`
transient (retry once).

The anonymous equivalent is `POST /api/public/customer-query` with an
`email` in the body, rate limited to 10/email, 20/IP and 500/hour globally.

---

## [Read the capability manifest](#capabilities-endpoint)

**`GET https://ship.embarko.ai/capabilities`** · sync · safe · no auth

The machine-readable list of what exists, cached for an hour. Each feature
carries `status` and a `via` array naming who can invoke it (`agent`,
`dashboard`, or both).

**Call this before relying on a feature.** Anything reported `"unavailable"`
is genuinely not built — do not design around it. This endpoint wins over
any prose page, including this one.

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
| Delete the app | `DELETE /apps/<name>` `{"confirmAppName": "<name>"}` | Irreversible, no backup |

Four behaviours worth stating outright:

- **You cannot create the DNS record.** Register and verify are yours;
  the record itself lives in the user's registrar account. Hand them what
  `POST /domains` returns and wait.
- **Analytics returns `503` when the subsystem is unreachable.** That is
  not zero traffic — do not report it as such.
- **Rename changes the display name only.** The slug is the URL and does
  not move. A different URL means a different app.
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
