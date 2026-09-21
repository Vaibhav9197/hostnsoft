# Agent playbook

Procedures, not reference. Each one is a sequence you can follow start to
finish without stopping to work out what comes next.

Pair this with the [API contract](api.md) — the playbook says *what to do in
what order*, the contract says *exactly what each call takes and returns*.

## [Ground rules](#ground-rules)

**Act. Don't ask.** Do not stop to ask the user anything you can determine
yourself, and do not ask permission to continue a task they already asked
for. Ask only when a third-party secret is needed, DNS ownership requires
them, money is involved, a destructive action needs confirming, or a
genuinely consequential decision can't be inferred.

Everything else — choosing a name, picking a port, reading an error, fixing
the app, redeploying — is yours to do. The full boundary, including the
hosting questions you must never put to them, is
[When to involve the human](escalation.md).

**Never report success you haven't verified.** A `202` is not a live app.
The only proof is `deploy.status: "success"`, and the only honest next step
is fetching the URL and finding it serves.

**Tell them the 24-hour rule.** If you deployed anonymously, the app is
deleted in 24 hours. Say so in the same message as the URL, every time.

---

## [Deploy a new application](#deploy-new)

**1. Confirm Embarko fits.** A web app, one process, under 256MB, no
scheduled jobs or background workers. If it doesn't fit, say so now rather
than after a failed deploy — see
[when Embarko doesn't fit](overview.md#not-right-when).

**2. Identify what you are deploying.** Find the directory whose manifest
(`package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Gemfile`,
`composer.json`, `Cargo.toml`) or `index.html` is at its *root*.

- If the repo root delegates its build to a subfolder — a `workspaces` entry,
  `"build": "npm --prefix frontend ..."`, or `cd frontend && ...` — **deploy
  that subfolder**, not the root.
- A frontend and a backend in one repo are **two deploys** under two names.

**3. Check the app against the runtime contract**, and fix it now rather
than after a failure:

| Requirement | What to look for |
| --- | --- |
| Reads `process.env.PORT` | Not a hardcoded `3000` |
| Binds `0.0.0.0` | Not `localhost` / `127.0.0.1` |
| No Dockerfile | Delete it or exclude it |
| Durable writes under `DATA_DIR` | Any SQLite file, uploads, generated data |
| No `window.storage` | Rejected at deploy time |
| Production start command | Not a dev server — it will OOM |

**4. Choose the app name.** Lowercase letters, numbers, dashes; 3–63
characters. Slugify anything given in prose: "My Landing Page" →
`my-landing-page`. This becomes the public subdomain.

**5. Check for an existing token** — `$DEPLOY_TOKEN`, then
`~/.embarko/credentials`. **Do not ask the user for one.** If neither
exists, deploy anonymously; that is the intended first deploy.

**6. Package and deploy:**

```bash
tar -czf /tmp/app.tar.gz --exclude=node_modules --exclude=.git \
  --exclude='.env*' -C /path/to/app .

curl -X POST "https://ship.embarko.ai/apps" \
  -H "X-App-Name: my-app" \
  -H "X-App-Version: $(git rev-parse --short HEAD 2>/dev/null || date +%s)" \
  -F "source=@/tmp/app.tar.gz"
```

Add `-H "Authorization: Bearer $DEPLOY_TOKEN"` if you found one in step 5.

- `409 app_name_taken` → another company owns the name. **Pick a different
  one and go back to step 6.** Do not retry the same name.
- Any other `4xx`/`422` → read `code`, fix the cause, resend. See
  [the error table](api.md#deploy).

**7. Wait for it to be live.** Poll every 3–5 seconds:

```bash
curl "https://ship.embarko.ai/apps/my-app/status"
```

Until `deploy.status` is no longer `in_progress`. On `failed`, go to
[Deployment failed](#deploy-failed). Give up after 10 minutes and read logs.

**8. Verify, then report.** Fetch `https://my-app.app.embarko.ai` and
confirm it responds. Then give the user the URL — and, if you deployed
anonymously, tell them it disappears in 24 hours and offer to make it
permanent ([Make an app permanent](#claim)).

---

## [Update an existing application](#update)

**1. Use the same app name.** That is the whole of "finding the project" —
the name is the identity. Never invent `my-app-v2`; a new name creates a
second app on a second subdomain.

If you don't know the name, it is the subdomain of the live URL:
`https://**my-app**.app.embarko.ai`.

**2. Deploy the new version** exactly as in
[step 6 above](#deploy-new), same name, new `X-App-Version`. Env vars,
custom domains and `DATA_DIR` data are all preserved.

Use the token if the app is claimed — an anonymous deploy cannot update a
claimed app.

**3. Wait for health.** Poll status until it leaves `in_progress`.

**4. If `success`:** fetch the URL, confirm it serves, report it.

**5. If `failed`:** go to [Deployment failed](#deploy-failed).

**6. If it built but the app is now broken,** and the previous version was
fine, [roll back](#rollback) first and fix afterwards. A working old version
beats a broken new one while you debug.

---

## [Deployment failed](#deploy-failed)

Work in this order. Do not redeploy and hope, and do not hand the user a raw
log.

**1. If the `POST /apps` call itself returned non-2xx**, the build never
started. Read `code` and fix that — these name their own cause, and several
name the fix in the response (`foundNestedAt`, `deployThisInstead`). Full
table: [deploy errors](api.md#deploy). Skip to step 4.

**2. Otherwise read the status:**

```bash
curl "https://ship.embarko.ai/apps/my-app/status"
```

`errorDetail` on a `failed` deploy names what happened.

**3. Read the logs — stderr first:**

```bash
curl "https://ship.embarko.ai/apps/my-app/logs?stream=stderr"
curl "https://ship.embarko.ai/apps/my-app/logs"
```

This works even when the build failed and no container started — the
response carries `source: "build"` and the failing command.

Read these three correctly:

| In the log | What it actually means |
| --- | --- |
| `exit code: 127` | **Command not found** in the build. The tool isn't in dependencies, or the real app is in a subdirectory. A trailing `docker-import ... no such file` line is a cascade, not the cause. |
| `OOM Killed`, `Exit Code: 137` | Over 256MB. Usually a dev server shipped as the start command, or an unused embedded database. |
| `Not Restarting`, `Exceeded allowed attempts` | A crash loop. **The real cause is logged above this line** — scroll up. |

**4. Identify the application-level cause** and match it against
[troubleshoot.md](troubleshoot.md). The usual four:

- Binds `localhost` or a hardcoded port → use `0.0.0.0` and `PORT`.
- Build delegated to a subfolder → deploy the subfolder.
- Dev server as start command → use the production command.
- Writes outside `DATA_DIR` → move the path; `ENOENT` on the next deploy.

**5. Fix the app and redeploy** the same name. A redeploy resets the restart
counter.

**6. Only involve the user** if the fix needs something you don't have — a
secret, a decision, or a capability Embarko lacks. Otherwise finish the job
and tell them what was wrong once it works.

---

## [Roll back](#rollback)

**1. List the history** and find the deployment to return to:

```bash
curl "https://ship.embarko.ai/api/apps/my-app/deployments" \
  -H "Authorization: Bearer $DEPLOY_TOKEN"
```

Needs a deploy token. Only entries whose status is `success` are valid
targets.

**2. Pick the target deliberately.** The newest `success` *before* the bad
one — not simply the previous entry, which may itself be a failure or
another bad deploy. Note its **id**.

**3. Roll back to that id.** The id in the URL is what chooses the version:

```bash
curl -X POST \
  "https://ship.embarko.ai/api/apps/my-app/deployments/<deploymentId>/rollback" \
  -H "Authorization: Bearer $DEPLOY_TOKEN"
```

**4. Poll the returned deployment** until its status leaves `in_progress`.
It answers `202` immediately; the switchover is not instant.

**5. Verify** the URL serves the old version, then tell the user what you
rolled back to and why.

**If you get `422 rollback_image_unavailable`:** the image was pruned. The
response's `retainCount` says how many deploys back you can still reach —
pick a target within that, or redeploy the old source from git instead.

**What rollback does not do:** restore old env vars or domains (it reruns the
old image under *today's* configuration), rewrite history (it adds a new
entry), or recover data (`DATA_DIR` is untouched and has no backup).

---

## [Add a secret](#add-secret)

**1. Get the value from the user.** This is one of the four legitimate
reasons to ask — you cannot invent an API key. Ask for it directly and don't
log it.

**2. Write it.** Requires a deploy token; key must match
`^[A-Za-z_][A-Za-z0-9_]*$`:

```bash
curl -X PUT "https://ship.embarko.ai/api/apps/my-app/env-vars/STRIPE_KEY" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "sk_live_..."}'
```

**3. Apply it — this step is not optional.** A write only stores the value;
the running app keeps using the old one until you do this:

```bash
curl -X POST "https://ship.embarko.ai/api/apps/my-app/env-vars/apply" \
  -H "Authorization: Bearer $DEPLOY_TOKEN"
```

A redeploy also picks it up. `apply` is faster because it skips the build.

**4. Confirm by behaviour, not by reading it back.** Values are write-only —
`GET /env-vars` returns keys only. Verify by exercising the feature that
needs the secret.

**5. Make sure it isn't also in the source.** If the key was committed or
sat in a `.env` file you packaged, it is in the deployed image. Remove it,
redeploy, and tell the user to rotate it.

---

## [Add a custom domain](#add-custom-domain)

**You cannot do this one.** There is no API, and the DNS record must be
created in the user's own registrar account. Your job is to make their part
as short as possible.

**1. Tell them up front** it's a dashboard task, and that a subdomain
(`app.theirdomain.com`) is better than an apex (`theirdomain.com`) — an apex
gets an `A` record straight to the origin and loses any CDN or DDoS proxy
they had in front of it.

**2. Give them these steps:**

1. Open the project in the dashboard → **Custom Domains**.
2. Enter the domain.
3. Copy the exact DNS record shown — a `CNAME` for a subdomain, an `A`
   record for an apex.
4. Create that record at their DNS provider. **On Cloudflare it must be
   DNS-only (grey cloud), not Proxied (orange cloud)** — a proxied record
   never verifies.
5. Click **Verify**. Safe to click repeatedly while DNS propagates.
6. Wait for status **Active**.

**3. If verification never succeeds**, the cause is almost always one of
three: the record is proxied; the record doesn't match exactly; or port 80
is blocked or redirected for that hostname (certificate issuance uses an
HTTP-01 challenge and needs it open). See
[troubleshoot.md](troubleshoot.md#verify-stuck-on-not-resolving-yet-despite-a-correct-looking-record).

**4. Nothing breaks meanwhile.** The default
`<app-name>.app.embarko.ai` URL keeps working, before and after.

---

## [Make an anonymous app permanent](#claim)

An app deployed without a token is deleted 24 hours after creation. Claiming
it cancels that.

**1. Check for a token you already have** — `$DEPLOY_TOKEN`,
`~/.embarko/credentials`.

**2. If there is none, request one by email:**

```bash
curl -X POST "https://ship.embarko.ai/api/public/deploy-tokens/request" \
  -H "Content-Type: application/json" \
  -d '{"email": "them@example.com"}'
```

Confirm the address with the user first — whoever reads that inbox gets the
token. Call this **once**: it always returns `202` whether or not it worked,
so retrying tells you nothing and burns the rate limit.

**3. Ask them to paste the token back to you.** It is emailed and never
returned in the response — you cannot read it yourself.

**4. Save it** to `~/.embarko/credentials` (`chmod 600`) and export
`DEPLOY_TOKEN`, so later deploys don't repeat this.

**5. Redeploy the same app name with the token.** That claims it: the expiry
is cancelled and it becomes an ordinary app, with no trace of having been
anonymous.

**6. Confirm** the deploy succeeded, and tell the user the app is now
permanent.

---

## [The app is live but misbehaving](#app-broken)

The deploy succeeded, so this is a runtime problem, not a build one.

**1. Check whether it's actually running:** `GET .../status` — `health`
describes the app right now, independently of the last deploy.

**2. Read the runtime logs**, stderr first. Look above any crash-loop line
for the real cause.

**3. If it's OOM** (`Exit Code: 137`): 256MB is fixed and cannot be raised
today. Reduce the footprint — production start command, drop unused
dependencies, don't hold large data in memory.

**4. If data vanished:** it was written outside `DATA_DIR`. Everything
outside it resets on every deploy. Move the path and redeploy.

**5. If it worked before the last deploy**, [roll back](#rollback) to
restore service first, then debug at your own pace.

---

## [Related](#related)

- [API contract](api.md) — exact parameters, responses, errors, retry rules.
- [Capabilities](capabilities.md) — what exists, with limits.
- [Troubleshooting](troubleshoot.md) — every error code and its fix.
- [Overview](overview.md) — what Embarko is and when to choose it.
