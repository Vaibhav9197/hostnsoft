# Embarko Documentation

**New here? Read [the overview](overview.md) first.** It says what Embarko
is, what it does and doesn't do yet, and which apps belong on it — no API
syntax, readable on its own. This page is the reference: the deploy API,
environment variables, rollback, custom domains, and the error paths.

## [Read this first (agent contract)](#agent-contract)

If you are an AI agent deploying on someone's behalf, these ten lines are the
load-bearing ones. Everything below this section is detail.

1. **Deploy first, credential later.** `POST https://ship.embarko.ai/apps`
   with no `Authorization` header works and gives a live URL. Never ask the
   user for a token before anything is deployed.
2. **An anonymous app is deleted after 24 hours.** Say this when you report
   the URL. Redeploying the same `X-App-Name` *with* a token claims it
   permanently.
3. **`202` is not "live".** Poll the response's `statusUrl` until
   `deploy.status` is `"success"` or `"failed"`. Only report the URL after
   `"success"`.
4. **The app must read `PORT` and bind `0.0.0.0`.** Not a hardcoded port, not
   `localhost`. No Dockerfile.
5. **Only `DATA_DIR` survives a redeploy.** Anything else written at runtime
   is gone on the next deploy.
6. **Budget 256MB of memory.** It is hard-enforced (OOM kill, exit 137) and
   there is no self-serve way to raise it today. Ship a production start
   command, not a dev server.
7. **One deploy is one app**, and the app's manifest must sit at the root of
   what you package — a repo with a frontend and a backend is two deploys.
   See [`422 app_nested_in_subdirectory`](troubleshoot.md#422-app_nested_in_subdirectory).
8. **The app name is the public subdomain**, unique across the whole platform
   and `^[a-z0-9-]{3,63}$`. Slugify prose names. A collision is
   `409 app_name_taken` — pick another name, don't retry.
9. **Never package secrets.** Exclude `.env*` from the tarball and set real
   secrets as [environment variables](#environment-variables) after the app
   exists.
10. **Branch on the `code` field, not the `error` string**, and on failure
    look that code up in [`troubleshoot.md`](troubleshoot.md) before changing
    anything. Don't retry blindly and don't hand-roll API calls around a
    failing step.

### [The five things you'll be asked to do](#common-tasks)

| The user says | What you do |
| --- | --- |
| "Deploy this app." | [Quick start](#quick-start) — package, `POST /apps`, poll `statusUrl`, report the URL. |
| "The deployment failed." | [Diagnosing a failed deploy](#diagnosing-a-failure) — status, then logs, then the `code` in [`troubleshoot.md`](troubleshoot.md), then fix and redeploy. |
| "Add a custom domain." | [Custom domains](#custom-domains) — register and verify it yourself; only the DNS record needs the user. |
| "Roll it back." | [Rollback](#rollback) — list deployments, pick the last good one, roll back, poll until it's applied. |
| "Change a setting / API key." | [Environment variables](#environment-variables) — write it, then `POST /env-vars/apply`, or it won't reach the running app. |
| *(the API is unreachable)* | [If you can't reach the API](agent-playbook.md#no-connectivity) — not a deploy failure. Don't retry; use the Embarko connector, or hand the user a script. |

A shorter, single-file version of everything below — written for agents — is
at [`https://embarko.ai/llms.txt`](/llms.txt).

## [Overview](#overview)

Embarko deploys apps from source to a live URL, and gives each company a
dashboard/API to manage what's running: environment variables, deployment
history, rollback, and custom domains.

**Deploying always goes through the Deploy API**
(`https://ship.embarko.ai/apps`) — there's no upload-through-the-dashboard
flow, so this is what an agent, CI pipeline, or your own script uses to
actually ship code.

**Deploying needs no credential at all** — see
[Quick start](#quick-start). A deploy token is what makes an app permanent and
lets you manage it afterwards; it is not a precondition for getting a live URL.

**Most management after the first deploy can be done the same way**, with a
deploy token, through the app control plane
(`https://ship.embarko.ai/api/apps/<app-name>`): environment variables,
rollback, and deployment history. Each section below gives both the API call
and the dashboard equivalent, so an agent doesn't have to hand the work back
to a person.

**Custom domains**, **analytics**, **renaming**, and **deleting a project**
are all agent-callable now (the DNS record for a custom domain still needs
a person at their own registrar, but the register/verify/delete calls
around it don't). Deleting is irreversible with no backup, so the agent
path requires an explicit confirmation on top of the deploy token — see
[Deleting a project](#deleting-a-project).
[`GET /capabilities`](#capabilities) is the authoritative answer either way:
every feature carries a `via` field naming who can invoke it.

A few things that apply everywhere below:
- **Projects auto-create on first deploy.** No dashboard step is required
  beforehand. With a token, the first deploy of a new app name creates its
  project under that token's company; without one it creates an unclaimed app
  you can claim later (see [Anonymous deploys](#anonymous-deploys)).
- **App names are unique platform-wide**, not just within your company — an
  app name is also its live subdomain (`<app-name>.app.embarko.ai`). If
  another company already used the exact name you're deploying,
  `code: "app_name_taken"`. See [App names](#app-names) for the rules.
- **Every non-2xx response has a `code` field.** Branch on `code`, not on the
  human-readable `error` string, which can change without notice. Full list
  in [`troubleshoot.md`](troubleshoot.md).

For every error/edge case and known platform constraint, see
[`troubleshoot.md`](troubleshoot.md) — this doc only covers the happy path.

## [Where your app runs](#where-your-app-runs)

### [Where it runs](#regions)

Your app runs on **managed infrastructure certified to ISO/IEC 27001**, in a
region chosen by Embarko.

**Region selection is not available.** There is no region parameter on any
API call and no setting in the dashboard, so an agent should never ask the
user to choose one or send a region field. The ability to choose is a
planned feature.

**The region an app runs in is not guaranteed** and may change. Your app's
compute and its `DATA_DIR` volume always live together — they are never
split — but which region that is, is not something the platform commits to
today.

If data residency matters for the app you are deploying — personal data
under GDPR, or a sector rule about where records may be held — **check the
[DPA](/dpa) before deploying**, and tell the user rather than assuming. Do
not tell a user their app runs in a particular country.

### [Isolation](#isolation)

Each app gets its own environment, its own filesystem and its own volume. An
app can reach its own storage under `DATA_DIR` and nothing else on the
platform — there is no path to another customer's app, data, or secrets.

One caveat, stated plainly because it affects how you build: **network
isolation between containers has not been verified**. Don't treat "it's
internal" as a security boundary — authenticate and encrypt anything
sensitive, and see
[Limitations](limitations-and-recommendations.md#network-isolation-between-different-apps-containers-is-unverified).

### [Encryption](#encryption)

Traffic is served over HTTPS on `*.app.embarko.ai` and on connected custom
domains, with certificates issued and renewed automatically. Data is
encrypted in transit, and at rest by the storage provider. Environment
variables are encrypted under a separate key and exposed only to your own
app's runtime.

### [Durability](#durability)

Storage under `DATA_DIR` survives every redeploy and restart. It is **not
backed up** — that is a different guarantee from surviving hardware loss,
and there is no snapshot or restore today. Automatic backups are in
progress. See [Limitations](limitations-and-recommendations.md).

### [Data protection and GDPR](#gdpr)

You are the controller for the personal data your app processes; Embarko is
your processor, under a DPA built on Article 28. See the [DPA](/dpa).

The infrastructure Embarko runs on is certified to **ISO/IEC 27001**, the
international standard for information-security management — audited by an
external body rather than self-declared. One distinction matters here, and
most hosting pages blur it:

> The ISO/IEC 27001 certificate is held by the infrastructure provider
> Embarko runs on. It covers their facilities and their information-security
> management. **It is not a certification of Embarko itself**, and "Embarko
> is ISO 27001 certified" is not a true statement.

### [What this does not cover](#boundary)

`embarko.ai` itself and the dashboard run on separate infrastructure and are
outside the boundary described above. The certification covers the
infrastructure provider's facilities — it says nothing about where your data
is located, which is a separate question and a separate document.

If a compliance review needs the boundary drawn precisely, the [DPA](/dpa)
and [Privacy Policy](/privacy) are the documents to read — not this page.

## [Quick start](#quick-start)

Nothing to sign up for and no credential to fetch. Deploy first, get a live
URL, and decide about a token afterwards.

**1. Package and deploy:**

```bash
tar -czf /tmp/my-app.tar.gz --exclude=node_modules --exclude=.git --exclude='.env*' -C /path/to/app .

curl -X POST "https://ship.embarko.ai/apps" \
  -H "X-App-Name: my-app" \
  -H "X-App-Version: $(git rev-parse --short HEAD)" \
  -F "source=@/tmp/my-app.tar.gz"
```

**Never ship secrets in the tarball.** The `--exclude='.env*'` above only
protects you if your secrets actually live in `.env`-named files — keep all
API keys, tokens, and credentials there (not in some other config file) so
this exclude pattern catches them. Real secrets belong in
[Environment variables](#environment-variables), set through the API or
dashboard after the app exists, never uploaded as part of the source.

You'll get a `202` immediately — the build/deploy itself continues in the
background:

```json
{
  "success": true, "accepted": true,
  "version": "1788947902193", "image": "my-app:1788947902193", "memory": "256MB",
  "url": "https://my-app.app.embarko.ai",
  "statusUrl": "https://ship.embarko.ai/apps/my-app/status",
  "logsUrl": "https://ship.embarko.ai/apps/my-app/logs"
}
```

The response hands you `url`, `statusUrl` and `logsUrl` — **use those rather
than assembling them from the app name**, so a change to the address format
doesn't break you. An anonymous deploy adds an `orphan` object whose
`expiresAt` is the exact deletion deadline; give the user that, not a vague
"24 hours". Full shape: [API contract](api.md#deploy).

**2. Poll until it's live** — no credential needed for an app deployed this
way:

```bash
curl "https://ship.embarko.ai/apps/my-app/status"
```

Wait for `deploy.status` to be `"success"` (or `"failed"` — check `.../logs`
if so). Once successful, your app is live at `https://my-app.app.embarko.ai`.
Full details on both endpoints: [Checking deploy status & logs](#status-and-logs).

**3. Keep it, when you're ready.** A deploy with no credential is real and
live, but it is torn down after 24 hours. Redeploying the same `X-App-Name`
with a token claims it permanently — see [Authentication](#authentication).
That step is worth doing once the app is worth keeping; it is not worth
blocking the first deploy on, and an agent shouldn't ask the user for a
token before there is anything to look at.

## [Your app's requirements](#your-apps-requirements)

- **Listen on `process.env.PORT`**, bound to `0.0.0.0` — not a hardcoded port,
  not `127.0.0.1`/`localhost` only.
- **No Dockerfile needed** — the platform builds your app with
  [Railpack](https://railpack.com), which auto-detects your language/runtime
  from your source (Node, Python, etc.).
- **Anything that needs to survive a redeploy must live under `DATA_DIR`**
  (an env var the platform provides) — a fresh container is scheduled on
  every redeploy, and only `DATA_DIR` persists across that. See
  [`limitations-and-recommendations.md`](limitations-and-recommendations.md#only-data_dir-survives-a-redeploy)
  for the full explanation and a concrete example of getting this wrong.
- **Don't use `window.storage`** — a Claude Artifacts sandbox API that
  doesn't exist here. Use SQLite (`better-sqlite3`) under `DATA_DIR`
  instead.

## [App names](#app-names)

An app name is also its live subdomain, so it has to be a valid hostname
label. `GET /capabilities` reports these under `limits`, and they are what
`X-App-Name` is checked against:

| Rule | Value |
|---|---|
| Characters | lowercase letters, numbers and dashes (`^[a-z0-9-]+$`) |
| Length | 3–63 characters |
| Dashes | may not be the first or last character |
| Scope | unique platform-wide, not per company |

Some names are reserved by the platform — `ship`, `api`, `www`, `login`,
`docs`, `admin` and `mail` among them. That list is longer than those
examples, so treat a rejection as authoritative rather than assuming a name
is free because it isn't listed here.

## [Capabilities](#capabilities)

`GET https://ship.embarko.ai/capabilities` — the machine-readable version of
this page's constraints. No authentication, cached for an hour, and safe to
read before you have a token.

It answers the questions you need settled *before* writing an app: the
runtime contract (`PORT`, `0.0.0.0`, no Dockerfile), what survives a
redeploy and what doesn't, how to obtain a credential, the memory defaults,
and which features exist. Each feature also says **who can invoke it** —
each names who can invoke it, so an agent can tell in advance whether it
can do a thing itself or has to hand it to a person.

```json
{
  "runtime": { "port_env": "PORT", "bind_address": "0.0.0.0", "dockerfile": "rejected" },
  "persistence": { "data_dir_env": "DATA_DIR", "survives_redeploy": true, "survives_node_loss": false },
  "features": {
    "deploy":         { "status": "available", "via": ["agent", "dashboard"] },
    "env_vars":       { "status": "available", "via": ["agent", "dashboard"] },
    "rollback":       { "status": "available", "via": ["agent", "dashboard"] },
    "custom_domains": { "status": "available", "via": ["agent", "dashboard"] },
    "analytics":      { "status": "available", "via": ["agent", "dashboard"] },
    "rename_app":     { "status": "available", "via": ["agent", "dashboard"] },
    "delete_app":     { "status": "available", "via": ["agent", "dashboard"] },
    "backups":        { "status": "unavailable" }
  }
}
```

Anything reported `"unavailable"` is genuinely not built — don't design
around it.

## [Authentication](#authentication)

**A deploy does not require a credential.** Omitting `Authorization` is a
supported, first-class path — not a degraded mode — and it is the right way to
get an app live for the first time. What a token buys is permanence and
management: an app deployed without one is torn down after 24 hours, and the
control-plane calls further down (env vars, rollback, history) need one.

If you are an agent doing this on someone's behalf: deploy first, show them
the URL, and raise the token only when they want to keep the app. Asking for a
credential before anything is running turns a one-minute trial into a signup.

### [Anonymous (no token) deploys](#anonymous-deploys)

Omit the `Authorization` header entirely to deploy without an account first —
useful for trying the platform before committing to one. This creates an
**unclaimed ("orphan") project** that:
- Gets a `24h` expiry — after that, the app and its container image are
  torn down automatically.
- Shows a live countdown banner injected into the app's own pages (HTML apps
  only — see [`troubleshoot.md`](troubleshoot.md#the-in-app-will-be-deleted-banner-doesnt-show-up)).
- Can be **claimed** at any point before expiry by redeploying the exact same
  `X-App-Name` **with** a valid token — this cancels the expiry and the
  project behaves like any other project from then on, with no trace of
  having been anonymous.

A present-but-invalid token is always a hard `401`, never silently treated
as anonymous — only a completely absent header opts into this path.

### [Deploy tokens](#deploy-tokens)

Needed to claim an app, and for everything under
[Environment variables](#environment-variables),
[Rollback](#rollback) and [Showcase](#showcase).

```
Authorization: Bearer <token>
```

**Check for an existing token first.** Before requesting or asking for a
new one, look for `$DEPLOY_TOKEN` in the environment and for a stored
credential (e.g. `~/.embarko/credentials`). If either is already set, reuse
it — an agent shouldn't re-request a token, or ask the user for one, when
one is already available. When a new token is obtained, save it locally
(`chmod 600`) so future deploys in the same environment reuse it too.

1. Open your company's **Deploy tokens** page
   (`https://embarko.ai/app/tokens`) — it asks you to sign in, or to create
   an account, if you aren't already.
2. Enter a label (e.g. `"CI pipeline"`) and click **Create token** — shown
   once, prefixed `emb_`, and cannot be retrieved again. (Tokens issued
   before the Embarko rename start `hns_` and remain valid — there's no
   need to rotate them.)
3. `export DEPLOY_TOKEN="..."` (or store it in a local credentials file,
   e.g. `~/.embarko/credentials`, `chmod 600`).

**By email, no browser needed** — once a token is actually needed, this is
the route to prefer when an AI agent is doing the work, since it needs nothing
but an email address:

```bash
curl -X POST "https://ship.embarko.ai/api/public/deploy-tokens/request" \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com"}'
```

Always returns `202` — the token is emailed, never returned in the
response, and an account and company are created automatically if that
address doesn't have one. Rate limited per-email, per-IP and globally.

The token only ever reaches that inbox. This call cannot return it to the
caller, print it in a terminal, or hand it to whatever is making the
request — including an AI agent — so there is nothing to relay back. Confirm
the address is one the requester actually controls before calling this;
whoever can read that inbox is whoever ends up with the token.

**Rotating/revoking**: from the same page, **Rotate** issues a replacement
under the same label — the old token keeps working for **one hour**
afterward so an in-flight CI run doesn't break. **Revoke** disables a token
immediately. Because tokens are stored hashed and shown only once, **Rotate
is also how you recover a token you've lost** — there is no way to read an
existing one back.

Deploy tokens are company-wide (not scoped to one project) and authenticate
deploys only — they don't sign in to the dashboard itself.

## [Deploying / redeploying](#deploy)

`POST /apps` (same endpoint for the first deploy and every redeploy after —
just upload new source under the same `X-App-Name`):

| Header | Required | Notes |
|---|---|---|
| `Authorization` | no | `Bearer <token>` — omit for an anonymous deploy |
| `X-App-Name` | yes | see [App names](#app-names) |
| `X-App-Version` | no | defaults to a timestamp; pass a git SHA or semver tag for a meaningful history — never reuse a version tag for different code |

Body: multipart, field `source`, a `.tar.gz` of your app's source.

```bash
# Drop the Authorization line for an anonymous deploy — see above.
curl -X POST "https://ship.embarko.ai/apps" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" \
  -H "X-App-Name: my-app" \
  -H "X-App-Version: v1.2.0" \
  -F "source=@/tmp/my-app.tar.gz"
```

Redeploying picks up your **current** env vars and memory allocation
automatically — you don't need to resend them.

## [Checking deploy status & logs](#status-and-logs)

These live on the **deploy API** (`ship.embarko.ai`), not the platform
API — same host as `POST /apps`, so an agent or script that only ever talks
to the deploy API (never the dashboard) can still check on its own deploy
without a separate set of credentials.

**Auth model, same for both**: while a project is still an unclaimed
("orphan") anonymous deploy, no token is needed at all — anyone can check
it. Once claimed, a token for the owning company is required; a missing or
wrong one gets a `404` (never confirming the app exists to a caller who
doesn't own it), not a `401`.

### [Status](#status)

```bash
# An unclaimed anonymous deploy needs no header at all:
curl "https://ship.embarko.ai/apps/my-app/status"

# Once claimed, its owning company's token is required:
curl "https://ship.embarko.ai/apps/my-app/status" -H "Authorization: Bearer $DEPLOY_TOKEN"
```

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
  "health": { "...": "live status of the running app" }
}
```

`deploy.status` is `"in_progress"`, `"success"`, or `"failed"` — this is
what `POST /apps`'s `statusUrl` is for: poll this after the `202`
until it's no longer `"in_progress"`. `deploy` reflects the **most recent
deploy attempt this process has seen** (in-memory, not a durable history —
see your project's **Deployments** tab in the dashboard, or
[Monitoring your app](#monitoring) below, for durable history). `health`
reflects the app's actual current running state, independent of the last
deploy's outcome.

### [Logs](#logs)

```bash
# Drop the header while the app is still an unclaimed anonymous deploy.
curl "https://ship.embarko.ai/apps/my-app/logs" -H "Authorization: Bearer $DEPLOY_TOKEN"
curl "https://ship.embarko.ai/apps/my-app/logs?stream=stderr" -H "Authorization: Bearer $DEPLOY_TOKEN"
```

```json
{ "available": true, "allocId": "b457e652-...", "stream": "stdout", "logs": "...tail of recent output..." }
```

`?stream=stderr` is optional (default `stdout`). This is a **snapshot of
the tail of the most recent allocation's logs at the moment you call it**
— not a live stream — poll it if you need to watch output as it happens.
Always the most recent allocation regardless of whether it's currently
healthy, since the most common reason to check logs is a build/runtime
failure. If nothing's deployed yet: `{"available": false, "reason": "No
allocation has ever been created for this app yet"}`.

### [Diagnosing a failed deploy](#diagnosing-a-failure)

When a deploy fails, work in this order rather than redeploying and hoping.
The same steps cover both kinds of failure — the request being rejected
outright, and the build or the app failing afterwards.

**1. If `POST /apps` itself returned a non-2xx**, the deploy never started.
Read the `code` field in the response body and look it up in
[`troubleshoot.md`](troubleshoot.md). These are rejections with an exact
cause — `invalid_app_name`, `app_name_taken`, `unsupported_storage_pattern`,
`no_manifest_at_root`, `app_nested_in_subdirectory`, `unauthorized` — not
something to retry. Several of them tell you the fix in the response itself:
`foundNestedAt` and `deployThisInstead` name the folder you should have
packaged.

**2. Otherwise poll status and read `errorDetail`:**

```bash
curl "https://ship.embarko.ai/apps/my-app/status"
```

`deploy.status` of `"failed"` means the build or the first run failed.
`errorDetail` names what happened. If it is still `"in_progress"`, nothing
has failed yet — keep polling.

**3. Read the logs.** This works even when the build failed and no container
ever started: the response falls back to build output, marked
`source: "build"` with a `note` saying so, and that is where the actual
failing command is named.

```bash
curl "https://ship.embarko.ai/apps/my-app/logs?stream=stderr"
curl "https://ship.embarko.ai/apps/my-app/logs"
```

(Add `-H "Authorization: Bearer $DEPLOY_TOKEN"` once the app is claimed.)

Three log lines mislead if read alone:

- `exit code: 127` is **command not found** in the build image — the build
  tool isn't in the app's dependencies, or the real app lives in a
  subdirectory that was never installed. A trailing `docker-import … no such
  file or directory` line is a cascade, not the cause.
- `"OOM Killed"` / `Exit Code: 137` is the 256MB memory limit.
- `"Not Restarting"` / `"Exceeded allowed attempts"` is a crash loop whose
  real cause is logged *above* it — scroll up rather than reporting this line.

**4. Fix the app, then redeploy the same `X-App-Name`.** A redeploy resets the
restart counter. Match what you found against
[`troubleshoot.md`](troubleshoot.md) before changing anything speculative.

The most common causes, roughly in the order they occur: the app binds
`localhost` or a hardcoded port instead of `0.0.0.0` and `PORT`; the repo
root delegates its build into a subdirectory, so one deploy was attempted for
what is really two apps; a dev server shipped as the production start command
(slow, then OOM-killed); the app writes outside `DATA_DIR` and crashes with
`ENOENT` on the next deploy; and a static site packaged without an
`index.html` at the root.

Report the cause to the user in their terms and fix it yourself where you
can — handing over a raw log is not an answer.

## [Environment variables](#environment-variables)

Available to an agent as well as a person. The control plane lives at
`https://ship.embarko.ai/api/apps/<app-name>` and takes the same deploy token:

| operation | request |
| --- | --- |
| list keys | `GET /env-vars` |
| replace all | `PUT /env-vars` |
| set one | `PUT /env-vars/<key>` |
| delete one | `DELETE /env-vars/<key>` |
| apply to the running app | `POST /env-vars/apply` |

```bash
curl -X PUT "https://ship.embarko.ai/api/apps/my-app/env-vars/STRIPE_KEY" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "sk_live_..."}'

curl -X POST "https://ship.embarko.ai/api/apps/my-app/env-vars/apply" \
  -H "Authorization: Bearer $DEPLOY_TOKEN"
```

Keys must match `^[A-Za-z_][A-Za-z0-9_]*$`.

Two things behave differently from a typical API here:

- **Values are write-only.** `GET /env-vars` returns the keys, never the
  values — a secret the user set cannot be read back out, by you or by
  anyone else with the token.
- **A write alone doesn't reach the running app.** Env vars are baked into
  the app's configuration at deploy time, so a new value sits stored until
  you call `POST /env-vars/apply` or deploy again (see
  [`troubleshoot.md`](troubleshoot.md#env-var-changes-need-a-redeploy-to-reach-the-running-app)).

In the dashboard, the same thing: open the project's **Environment
Variables** section, edit, **Save**, then redeploy.

## [Rollback](#rollback)

No rebuild — reruns a past successful build's image under the current config
(current env vars and custom domains, not whatever they were at the time of
that old deploy). Available to an agent as well as a person:

Two steps: list the history, then roll back to the deployment you picked.
The deployment's id goes in the URL — that is what decides which version
comes back.

```bash
# 1. Find the deployment to return to (newest first).
curl "https://ship.embarko.ai/api/apps/my-app/deployments" \
  -H "Authorization: Bearer $DEPLOY_TOKEN"

# 2. Roll back to it, by its id.
curl -X POST \
  "https://ship.embarko.ai/api/apps/my-app/deployments/<deploymentId>/rollback" \
  -H "Authorization: Bearer $DEPLOY_TOKEN"
```

`GET /deployments/<id>` returns one entry, which is also how you poll the
rollback afterwards. In the dashboard: open the project's **Deployments**
history, find the successful deployment, and click **Rollback** next to it.

You'll see it confirmed right away, but **applying it takes a little
while** — same as a regular deploy, switching the app over isn't instant.
The dashboard shows this deployment as **in progress** until it's done,
then updates to **success** (or **failed**, if something went wrong
applying it — rare, since the one common failure mode, the old image
being gone, is caught immediately, before it's even confirmed as
started).

Only deployments that succeeded are valid targets. Rolling back
creates a **new** deployment history entry pointing at the old image — it
doesn't rewrite history. See
[`troubleshoot.md`](troubleshoot.md#rollback-target-image-unavailable) if the
target image was cleaned from the host.

## [Showcase](#showcase)

List a deployed app on an [Embarko Showcase](/showcase) page — the
company's own page (every company has one), or an event page anyone can
add to. Available to an agent as well
as a person, with the same deploy token and app-name addressing as
everything above:

```bash
curl -X PUT "https://ship.embarko.ai/api/apps/my-app/showcase" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collectionSlug": "iit-indore-2026",
    "name": "My App",
    "tagline": "One line on what it does",
    "creatorName": "Jane Doe",
    "whatItDoes": "A short paragraph on what it does.",
    "whyBuilt": "A short paragraph on why it was built.",
    "builtWith": "Claude",
    "category": "Productivity",
    "tags": ["ai", "productivity"],
    "screenshotUrl": "https://...",
    "videoUrl": "https://..."
  }'
```

`collectionSlug`, `name`, `tagline`, and `creatorName` are required;
everything else is optional. `collectionSlug` is the page's slug from its
URL (`/showcase/<slug>`) — an event page, or your own company page, which
exists from signup. `404 SHOWCASE_COLLECTION_UNKNOWN` for an unknown slug;
`403 SHOWCASE_COLLECTION_PRIVATE` if it's another company's page.

Calling this again for the same app and board **updates** the existing
listing instead of erroring — there's no separate edit endpoint, so fixing
a tagline or swapping a screenshot is just calling it again with new
values. `201` on first listing, `200` on update, both with the listing
(including its `/showcase/<slug>/<app-slug>` page).

In the dashboard, the same thing: open the app's **Showcase** tab (or
**Showcase** from the account menu), click **List an app**, and say what it
does. It goes on your company page by default;
choose **An event page** to add it to a hackathon or demo-day page instead.

## [Custom domain mapping](#custom-domains)

Point your own domain at a deployed app, instead of (or alongside) its
default `<app-name>.app.embarko.ai` URL. Available to an agent as well as a
person — **except the DNS record itself**, which only the domain's owner
can create with their own DNS provider; nothing here gets around that step.

**By API**, same deploy token and app-name addressing as env vars/rollback:

```bash
curl -X POST "https://ship.embarko.ai/apps/my-app/domains" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain": "app.yourdomain.com"}'
```

Returns the exact DNS record to create. A **subdomain** (like
`app.yourdomain.com`) gets a `CNAME` to a dedicated platform hostname. An
**apex/root domain** (`yourdomain.com`, no subdomain) can't use `CNAME`
under standard DNS rules — you'll get an `A` record to the platform's
origin IP instead, which means it bypasses any CDN/proxy you'd normally
put in front of it (see
[`troubleshoot.md`](troubleshoot.md#apex-root-domains-lose-your-cdnproxy-in-front-of-them)).
Hand that record to whoever controls the domain's DNS — an agent can't
create it on their behalf.

Once the record exists (and has propagated), verify it:

```bash
curl -X POST "https://ship.embarko.ai/apps/my-app/domains/app.yourdomain.com/verify" \
  -H "Authorization: Bearer $DEPLOY_TOKEN"
```

Safe to call repeatedly while DNS propagates — routing only activates once
this confirms DNS actually resolves correctly, not at the register step.
`GET /apps/my-app/domains` lists what's registered; `DELETE
/apps/my-app/domains/app.yourdomain.com` removes just that domain's
routing/certificate, never touching the app's default `*.app.embarko.ai`
URL.

**In the dashboard**, the same flow: open your project, go to **Custom
Domains**, enter the domain, follow the same DNS instructions, and click
**Verify**. If using Cloudflare, make sure the record is set to **DNS
only** (grey cloud), not **Proxied** (orange cloud) — a proxied record will
never verify, see
[`troubleshoot.md`](troubleshoot.md#verify-stuck-on-not-resolving-yet-despite-a-correct-looking-record).

Custom domains require port 80 reachable for certificate issuance — see
[`troubleshoot.md`](troubleshoot.md#custom-domain-activation-requires-port-80-reachable)
if verification never completes despite correct DNS.

## [Customer queries: feature requests & feedback](#feature-requests)

Send a feature request, feedback, or another kind of query. Three ways to
send one, depending on who's sending it — a message is required either way
(max 5000 characters).

### [From the dashboard (logged in)](#feature-requests-dashboard)

Open **Feedback** (or **Send feedback**) in the dashboard, choose
**Feature**, **Feedback**, or **Other**, write your message, and submit.
Your account email is attached automatically — you never need to enter it.

### [From an AI agent, while deploying](#feature-requests-agent)

For an agent (Claude Code, ChatGPT, whatever) to report feedback about the
app it's actively deploying, without needing dashboard credentials at all —
same auth as `.../status`/`.../logs` (a token is required once the app is
claimed, optional while it's still an anonymous orphan):

```bash
curl -X POST "https://ship.embarko.ai/apps/my-app/customer-query" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" \
  -H "X-Agent-Name: Claude Code" \
  -H "Content-Type: application/json" \
  -d '{"type": "feedback", "message": "Deploy docs did not mention DATA_DIR clearly enough"}'
```

`X-Agent-Name` is required — free text, so any current or future agent can
identify itself without needing a platform change to be recognized. Note
this one is on the **deploy API** host (`ship.embarko.ai`, no `/api` prefix)
— it's the same host `POST /apps` uses, unlike the other two paths here.

### [Anonymous, no account at all](#feature-requests-public)

```bash
curl -X POST "https://ship.embarko.ai/api/public/customer-query" \
  -H "Content-Type: application/json" \
  -d '{"type": "feedback", "message": "...", "email": "you@example.com"}'
```

Rate-limited (per-email, per-IP, and globally — see
[`limitations-and-recommendations.md`](limitations-and-recommendations.md#public-unauthenticated-endpoints-are-rate-limited))
since it requires no authentication at all.

## [Monitoring your app](#monitoring)

**By API**, available to an agent as well as a person, same deploy token
and app-name addressing as everything else above:

```bash
curl "https://ship.embarko.ai/apps/my-app/analytics?range=7d" \
  -H "Authorization: Bearer $DEPLOY_TOKEN"
```

`range` is one of `24h`, `7d`, `30d`, `90d`, or `all` (default `24h`).
Returns request traffic (status-code breakdown, total requests) and
CPU/memory usage over that range. `503`, not a fabricated empty result,
if the analytics subsystem is temporarily unreachable — different from
genuinely zero traffic.

**In the dashboard**, open your project:
- **Overview** — current health, latest deployment, and recent traffic at a
  glance.
- **Deployments** — full deployment history.
- **Logs** — recent output from the app (a snapshot, not a live stream —
  see
  [`limitations-and-recommendations.md`](limitations-and-recommendations.md#logs-are-a-recent-snapshot-not-a-live-stream)).
- **Analytics** — the same data as the API call above, over the same
  range options.

## [Renaming a project](#renaming-a-project)

Display name only — the app's slug, and so its live URL, never changes.
Available to an agent as well as a person:

```bash
curl -X PATCH "https://ship.embarko.ai/apps/my-app" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My App"}'
```

In the dashboard, the same thing: open your project, go to **Settings**,
and update the name.

## [Deleting a project](#deleting-a-project)

Tears down the running app (its container, routing, and image) as well as
the dashboard record — **this is not reversible**, and there is no backup.

Available to an agent as well as a person, but the deploy token alone
isn't enough — you also have to resend the app's own name to confirm:

```bash
curl -X DELETE "https://ship.embarko.ai/apps/my-app" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmAppName": "my-app"}'
```

Omitting `confirmAppName`, or getting it wrong, returns `400
confirmation_required` and deletes nothing. An agent should always show
the user what it's about to delete and get their go-ahead before sending
this — the confirmation field guards against a misread instruction, not
against an agent that's sure but wrong.

In the dashboard, the same thing: open your project, go to **Settings**,
and click **Delete project**.

## [Errors and known limitations](#errors)

See [`troubleshoot.md`](troubleshoot.md) for the full error-code reference,
and [`limitations-and-recommendations.md`](limitations-and-recommendations.md)
for the platform's actual constraints (persistence, memory/CPU/disk,
network isolation, logs, rate limits) paired with concrete recommendations
for each — worth reading once before you build something that assumes
guarantees the platform doesn't make.
