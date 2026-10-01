# Agent playbook

Procedures, not reference. Each one is a sequence you can follow start to
finish without stopping to work out what comes next.

Pair this with the [API contract](api.md) — the playbook says *what to do in
what order*, the contract says *exactly what each call takes and returns*.

## [Ground rules](#ground-rules)

**Act. Don't ask.** Do not stop to ask the user anything you can determine
yourself, and do not ask permission to continue a task they already asked
for. Ask only when a third-party secret is needed, DNS ownership requires
them, money is involved, a destructive action needs confirming, your
environment cannot reach Embarko at all, or a genuinely consequential
decision can't be inferred.

Everything else — choosing a name, picking a port, reading an error, fixing
the app, redeploying — is yours to do. The full boundary, including the
hosting questions you must never put to them, is
[When to involve the human](escalation.md).

**Never report success you haven't verified.** A `202` is not a live app.
The only proof is `status: "live"` from the status reply, and the only
honest next step is fetching the URL and finding it serves. Every reply
carries `next`, the one thing to do now — follow it.

**Tell them the 24-hour rule.** If you deployed anonymously, the app is
deleted in 24 hours. Say so in the same message as the URL, every time.

---

## [Deploy a new application](#deploy-new)

**1. Confirm Embarko fits.** A web app, one process, under 256MB, no
WebSockets, no cron or scheduled jobs, no background workers. If it doesn't fit, say so now rather
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
characters; no leading or trailing dash. Slugify anything given in prose: "My Landing Page" →
`my-landing-page`. This becomes the public subdomain.

**4a. Choose the app type (optional).** A short label for what the app is
for: `personal website`, `portfolio`, `landing page`, `task management`,
`feedback system`, or your own phrase if none of these fit (60 characters at
most). If what you built makes it obvious, use that and don't ask. If not,
ask the user once, together with the app name, and say they can skip it. If
they skip it, leave the `X-App-Type` header out. Never hold up a deploy
waiting for this answer.

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
  -H "X-App-Type: portfolio" \
  -H "X-Agent-Name: claude" \
  -F "source=@/tmp/app.tar.gz"
```

Add `-H "Authorization: Bearer $DEPLOY_TOKEN"` if you found one in step 5.
Use the app type from step 4a, or leave out the `X-App-Type` line if there
isn't one. Set `X-Agent-Name` to your own name as an agent (`claude-code`,
`claude`, `chatgpt`, `cursor`...), and send it on rollbacks and env var
applies too.

- `409 app_name_taken` → another company owns the name. **Pick a different
  one and go back to step 6.** Do not retry the same name.
- Any other `4xx`/`422` → read `code`, fix the cause, resend. See
  [the error table](api.md#deploy).

**7. Wait for it to be live.** Poll `links.status` every 10 seconds (every
2 for a static site, which is live almost immediately):

```bash
curl "https://ship.embarko.ai/apps/my-app/status"
```

Until `status` is `live`. On `failed` or `crashed`, go to
[Deployment failed](#deploy-failed). Give up after 10 minutes and read logs.

**8. Verify, then report.** Fetch `https://my-app.embarko.app` and
confirm it responds. Then give the user the URL — and, if you deployed
anonymously, tell them it disappears in 24 hours and offer to make it
permanent ([Make an app permanent](#claim)).

---

## [Update an existing application](#update)

**1. Use the same app name.** That is the whole of "finding the project" —
the name is the identity. Never invent `my-app-v2`; a new name creates a
second app on a second subdomain.

If you don't know the name, it is the subdomain of the live URL:
`https://**my-app**.embarko.app`.

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

`error` on a `failed` deploy names what happened, and `next` says what to do.

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

## [If you can't reach the API at all](#no-connectivity)

**This is not a deploy failure.** If the `POST /apps` request itself never
reaches `ship.embarko.ai` — connection refused, DNS failure, a proxy block,
a request that hangs and dies — then nothing was ever submitted. There is no
deploy to check the status of, no logs to read, and
[Deployment failed](#deploy-failed) does not apply.

**Recognise it, and stop retrying.** The usual cause is that your execution
environment is network-sandboxed with a fixed domain allowlist that doesn't
include `ship.embarko.ai` — common in hosted AI coding tools. The request is
blocked before it leaves your environment, so retrying the same call, or
trying a slightly different URL, changes nothing. Two or three failures with
the same shape means this, not a flaky network.

**1. If an Embarko connector is available to you, use it.** If your tool
lists an MCP connector named **Embarko**, its requests are made by the
connector infrastructure rather than your sandbox, which bypasses the
restriction entirely. Deploying through it needs the app's source at a
public `.tar.gz` URL rather than an upload — see
[the connector](capabilities.md#mcp-connector) for what it can and can't do.

**2. If there's no connector, say so plainly and give them the fix.** Tell
the user, in their words, that your environment can't reach Embarko's API —
not that the deploy failed, which sends them looking for a bug in their app.
Then tell them that if their AI tool supports MCP connectors (Claude,
Claude Code, or a ChatGPT tier with custom MCP connections), connecting one
named **Embarko** makes future deploys work directly in the conversation.
Give them the link for their tool from [Connectors](connectors.md).

**3. Either way, leave them something that works.** Don't stop at reporting
the problem. Give them a script they can run on their own machine, which has
normal network access:

```bash
tar -czf /tmp/app.tar.gz --exclude=node_modules --exclude=.git \
  --exclude='.env*' -C /path/to/app .

curl -X POST "https://ship.embarko.ai/apps" \
  -H "X-App-Name: my-app" \
  -F "source=@/tmp/app.tar.gz"

curl "https://ship.embarko.ai/apps/my-app/status"   # poll until not in_progress
```

**Do not fall back to an anonymous deploy** because an authenticated one was
blocked. Connectivity and credentials are different problems with different
fixes, and quietly downgrading gives the user a temporary app they didn't
ask for, deleted in 24 hours. If the token path is blocked, the anonymous
path is blocked too — it is the same host.

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

You do every step except one: **creating the DNS record**, which lives in
the user's registrar account. Do your parts without asking, and give them a
single, precise task.

**1. Advise on the shape first.** A subdomain (`app.theirdomain.com`) is
better than an apex (`theirdomain.com`) — an apex gets an `A` record
straight to the origin and loses any CDN or DDoS proxy in front of it. Say
this before they pick.

**2. Register the domain** and read back the record it returns:

```bash
curl -X POST "https://ship.embarko.ai/apps/my-app/domains" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain": "app.yourdomain.com"}'
```

Nothing is live yet — registering only reserves it and tells you the record.

**3. Give the user exactly that record**, spelled out: type, name, value.
Add the one thing they will otherwise get wrong — **on Cloudflare it must be
DNS-only (grey cloud), not Proxied (orange cloud)**, because a proxied
record never verifies.

**4. Verify, and keep verifying.** Safe to repeat while DNS propagates:

```bash
curl -X POST "https://ship.embarko.ai/apps/my-app/domains/app.yourdomain.com/verify" \
  -H "Authorization: Bearer $DEPLOY_TOKEN"
```

Routing activates only when this confirms. Poll it rather than asking the
user whether they have finished.

**5. If it never verifies**, the cause is almost always one of three: the
record is proxied; it doesn't match exactly; or port 80 is blocked or
redirected for that hostname (certificate issuance uses an HTTP-01 challenge
and needs it open). See
[troubleshoot.md](troubleshoot.md#verify-stuck-on-not-resolving-yet-despite-a-correct-looking-record).

**6. Confirm it works**, then tell them. The default
`<app-name>.embarko.app` URL keeps working throughout and afterwards.

`GET /apps/<name>/domains` lists what's registered;
`DELETE /apps/<name>/domains/<domain>` removes one without touching the
default URL.

---

## [Delete an app](#delete-app)

Irreversible, with no backup. The API can do it; the judgement is still
yours to escalate.

**1. Confirm with the user first, naming the app and what goes with it** —
the running app, its URL, and all data under `DATA_DIR`. Do not infer this
from a vague instruction.

**2. Delete, resending the name as confirmation:**

```bash
curl -X DELETE "https://ship.embarko.ai/apps/my-app" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmAppName": "my-app"}'
```

`400 confirmation_required` means the name was missing or wrong, and
nothing was deleted.

**3. Tell them the name is released** — someone else can now take that
subdomain.

---

## [Rename an app](#rename-app)

**1. Know what changes.** The **display name** only. The slug is the live
URL and `PATCH` does not move it. Say so before doing it, or they will
expect the URL to follow. If the URL is what they actually want changed,
that is a different and much heavier call —
[change the web address](#change-address).

**2. Rename:**

```bash
curl -X PATCH "https://ship.embarko.ai/apps/my-app" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My App"}'
```

**3. Keep using the original slug** for every other call.

---

## [Change an app's web address](#change-address)

Different from a [rename](#rename-app): that changes the label, this moves
the URL.

**1. Ask first, every time.** The old address stops working the moment the
new one is live. There is no redirect, anything already linking to it
breaks, and the freed name can be claimed by someone else. A name that
looks untidy to you is not a reason. A user who asked for a different
address is.

Tell them the app will be offline for a few minutes and keeps its data.

**2. Change it:**

```bash
curl -X POST "https://ship.embarko.ai/api/apps/my-app/slug-change"   -H "Authorization: Bearer $DEPLOY_TOKEN"   -H "Content-Type: application/json"   -d '{"newName": "my-better-app"}'
```

**3. Poll the `statusUrl` it returns** until `terminal` is true. This takes
minutes, not seconds — the app needs a fresh certificate for the new
hostname. `state` ends `succeeded` or `failed`, and `currentSlug` always
says where the app actually is. A failure leaves it on the old address,
untouched.

**4. Use the new name from now on.** The response's `deployWith` gives the
exact `X-App-Name`. Forgetting this is the usual way to break things after
a move.

**5. If you get `404 app_renamed`, follow it — don't redeploy.** It means
you are holding a stale name; the response carries `newName` and a
`retryUrl`. Deploying under the old name instead would create a second,
empty app.

**Once a week per app** (`429 slug_change_cooldown`, with `retryAfterMs`).
Each change spends a certificate from a budget shared with every new app.

**Tell them what does not break:** a custom domain is carried over and
keeps working, so if they have one their real address is unaffected. A
Showcase listing keeps its own separate URL.

---

## [Report how an app is doing](#analytics)

**1. Fetch the traffic and resource usage:**

```bash
curl "https://ship.embarko.ai/apps/my-app/analytics?range=7d" \
  -H "Authorization: Bearer $DEPLOY_TOKEN"
```

`range` is `24h`, `7d`, `30d`, `90d` or `all` (default `24h`).

**2. A `503` is not zero traffic.** It means the analytics subsystem is
unreachable. Say that, rather than reporting the app had no visitors.

**3. Summarise in their terms** — requests, errors, whether it is near its
memory ceiling — not raw numbers.

---

## [Choose how to authenticate](#choose-auth)

A first deploy needs nothing — skip this until a call needs a token. When
one does, go in this order and stop at the first that works. The three ways
in are explained in [Authentication](capabilities.md#agent-auth).

**1. An Embarko connector in your tools?** Use it. It acts as the signed-in
person, so there is no token to find, and apps it deploys are in their
account from the start — nothing to claim.

**2. A token already set?** Check `$DEPLOY_TOKEN` and
`~/.embarko/credentials`. Use it; don't request another.

**3. Neither?** Request one by email (step 2 of
[Make an anonymous app permanent](#claim)), or ask the person to create one
at `https://embarko.ai/app/tokens` and paste it — whichever suits them.
Either way it is the same account, as long as it is the same email.

**4. Offer the connector for next time.** If the person's AI tool is on
[Connectors](connectors.md), give them the link in one sentence: connecting
it once means no tokens from then on. Don't block the current task on it.

---

## [Make an anonymous app permanent](#claim)

An app deployed without a token is deleted 24 hours after creation. Claiming
it cancels that.

**1. Check for a token you already have** — `$DEPLOY_TOKEN`,
`~/.embarko/credentials`. (The full order, connector first, is
[Choose how to authenticate](#choose-auth).)

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
- [Connectors](connectors.md) — the link to add Embarko to each AI tool.
- [Troubleshooting](troubleshoot.md) — every error code and its fix.
- [Overview](overview.md) — what Embarko is and when to choose it.
