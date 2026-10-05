# Agent playbook

Step-by-step procedures for every common Embarko task. Follow each one from
start to finish.

| Task | Go to |
|---|---|
| First deploy | [Deploy a new application](#deploy-new) |
| Ship a new version | [Update an existing application](#update) |
| Build or start failed | [Deployment failed](#deploy-failed) |
| Requests never reach Embarko | [If you can't reach the API at all](#no-connectivity) |
| New version is broken | [Roll back](#rollback) |
| API key or secret | [Add a secret](#add-secret) |
| Own domain | [Add a custom domain](#add-custom-domain) |
| Remove an app | [Delete an app](#delete-app) |
| New display name | [Rename an app](#rename-app) |
| New URL | [Change an app's web address](#change-address) |
| Traffic and usage | [Report how an app is doing](#analytics) |
| A call needs a token | [Choose how to authenticate](#choose-auth) |
| Keep an anonymous app | [Make an anonymous app permanent](#claim) |
| Live app misbehaves | [The app is live but misbehaving](#app-broken) |

This page says what to do and in what order. The [API contract](api.md) says
exactly what each call takes and returns.

## [What rules apply to every task?](#ground-rules)

- **Act. Don't ask.** Don't ask anything you can work out yourself. Don't ask
  permission to continue a task the user already gave you.
- **Ask only when:** you have no connector and no token (ask once, see
  [Choose how to authenticate](#choose-auth)), a third-party secret is
  needed, DNS ownership needs them, money is involved, a destructive action needs confirming, your
  environment can't reach Embarko at all, or a big decision can't be
  inferred.
- **Everything else is yours:** choosing a name, picking a port, reading an
  error, fixing the app, redeploying. The full boundary, including hosting
  questions you must never ask them, is in
  [When to involve the human](escalation.md).
- **Never report success you haven't checked.** A `202` is not a live app.
  The only proof is `status: "live"` in the status reply. Then fetch the URL
  and confirm it serves.
- **Follow `next`.** Every reply carries `next`, the one thing to do now.
- **Tell them the 24-hour rule.** An anonymous app is deleted after 24 hours.
  Say so in the same message as the URL, every time.

---

## [How do I deploy a new application?](#deploy-new)

1. **Confirm Embarko fits.** A web app, one process, under 256MB. No
   WebSockets, no cron or scheduled jobs, no background workers. If it
   doesn't fit, say so now, not after a failed deploy. See
   [when Embarko doesn't fit](overview.md#not-right-when).
2. **Find what to deploy.** Pick the directory with a manifest
   (`package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`,
   `Gemfile`, `composer.json`, `Cargo.toml`) or `index.html` at its *root*.
   - If the repo root hands its build to a subfolder (a `workspaces` entry,
     `"build": "npm --prefix frontend ..."`, or `cd frontend && ...`),
     **deploy that subfolder**, not the root.
   - A frontend and a backend in one repo are **two deploys** under two
     names.
3. **Check the app against the runtime rules.** Fix problems now:

   | Requirement | What to look for |
   | --- | --- |
   | Reads `process.env.PORT` | Not a hardcoded `3000` |
   | Binds `0.0.0.0` | Not `localhost` / `127.0.0.1` |
   | No Dockerfile | Delete it or exclude it |
   | Durable writes under `DATA_DIR` | Any SQLite file, uploads, generated data |
   | No `window.storage` | Rejected at deploy time |
   | Production start command | Not a dev server, which will OOM |

4. **Choose the app name.** Lowercase letters, numbers and dashes. 3 to 63
   characters. No leading or trailing dash. Slugify names given in prose:
   "My Landing Page" becomes `my-landing-page`. This is the public
   subdomain.
5. **Choose the app type (optional).** A short label: `personal website`,
   `portfolio`, `landing page`, `task management`, `feedback system`, or
   your own phrase (60 characters at most).
   - If what you built makes it obvious, use that. Don't ask.
   - If not, ask once, together with the app name, and say they can skip it.
   - If they skip it, leave out the `X-App-Type` header.
   - Never hold up a deploy waiting for this answer.
6. **Get access:** use the Embarko connector if it is in your tools.
   Otherwise check `$DEPLOY_TOKEN`, then `~/.embarko/credentials`. If there
   is neither, ask the user once, as in
   [Choose how to authenticate](#choose-auth). If they skip it, deploy
   anonymously.
7. **Package and deploy:**

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

   - Add `-H "Authorization: Bearer $DEPLOY_TOKEN"` if step 6 found a token.
   - Use the app type from step 5, or drop the `X-App-Type` line.
   - Set `X-Agent-Name` to your own agent name (`claude-code`, `claude`,
     `chatgpt`, `cursor`...). Send it on rollbacks and env var applies too.
   - `409 app_name_taken`: another company owns the name. **Pick a different
     name and repeat this step.** Don't retry the same name.
   - Any other `4xx`/`422`: read `code`, fix the cause, resend. See
     [the error table](api.md#deploy).
8. **Wait until it is live.** Poll `links.status` every 10 seconds (every 2
   seconds for a static site, which is live almost at once):

   ```bash
   curl "https://ship.embarko.ai/apps/my-app/status"
   ```

   - Stop when `status` is `live`.
   - On `failed` or `crashed`, go to [Deployment failed](#deploy-failed).
   - After 10 minutes, stop polling and read the logs.
9. **Check, then report.** Fetch `https://my-app.embarko.app` and confirm it
   responds. Give the user the URL. If you deployed anonymously, tell them it
   is deleted in 24 hours and offer to [make it permanent](#claim).

---

## [How do I update an existing application?](#update)

1. **Use the same app name.** The name is the app's identity. Never invent
   `my-app-v2`: a new name makes a second app on a second subdomain. If you
   don't know the name, it is the subdomain of the live URL:
   `https://**my-app**.embarko.app`.
2. **Deploy the new version** as in [step 7 above](#deploy-new): same name,
   new `X-App-Version`. Env vars, custom domains and `DATA_DIR` data are kept.
   If the app is claimed, send the token. An anonymous deploy can't update a
   claimed app.
3. **Wait for health.** Poll status until it leaves `in_progress`.
4. **If `success`:** fetch the URL, confirm it serves, report it.
5. **If `failed`:** go to [Deployment failed](#deploy-failed).
6. **If it built but the app is now broken** and the old version was fine,
   [roll back](#rollback) first and fix it after. A working old version beats
   a broken new one while you debug.

---

## [What do I do when a deployment failed?](#deploy-failed)

Work in this order. Don't redeploy and hope. Don't hand the user a raw log.

1. **Did `POST /apps` itself return non-2xx?** Then the build never started.
   Read `code` and fix that. Some responses name the fix (`foundNestedAt`,
   `deployThisInstead`). Full table: [deploy errors](api.md#deploy). Skip to
   step 4.
2. **Otherwise read the status:**

   ```bash
   curl "https://ship.embarko.ai/apps/my-app/status"
   ```

   On a `failed` deploy, `error` says what happened and `next` says what to
   do.
3. **Read the logs, stderr first:**

   ```bash
   curl "https://ship.embarko.ai/apps/my-app/logs?stream=stderr"
   curl "https://ship.embarko.ai/apps/my-app/logs"
   ```

   This works even when the build failed and no container started. The
   response then has `source: "build"` and the failing command. Read these
   three correctly:

   | In the log | What it means |
   | --- | --- |
   | `exit code: 127` | **Command not found** in the build. The tool isn't in dependencies, or the real app is in a subdirectory. A trailing `docker-import ... no such file` line is a side effect, not the cause. |
   | `OOM Killed`, `Exit Code: 137` | Over 256MB. Usually a dev server used as the start command, or an unused embedded database. |
   | `Not Restarting`, `Exceeded allowed attempts` | A crash loop. **The real cause is logged above this line.** Scroll up. |

4. **Find the app-level cause** in [troubleshoot.md](troubleshoot.md). The
   usual four:
   - Binds `localhost` or a hardcoded port: use `0.0.0.0` and `PORT`.
   - Build handed to a subfolder: deploy the subfolder.
   - Dev server as start command: use the production command.
   - Writes outside `DATA_DIR`: move the path. Otherwise you get `ENOENT` on
     the next deploy.
5. **Fix the app and redeploy** under the same name. A redeploy resets the
   restart counter.
6. **Involve the user only** if the fix needs something you don't have: a
   secret, a decision, or a feature Embarko lacks. Otherwise finish the job
   and tell them what was wrong once it works.

---

## [What if I can't reach the API at all?](#no-connectivity)

**This is not a deploy failure.** If `POST /apps` never reaches
`ship.embarko.ai` (connection refused, DNS failure, proxy block, a request
that hangs and dies), nothing was submitted. There is no status to check and
no logs to read. [Deployment failed](#deploy-failed) doesn't apply.

**Stop retrying.** The usual cause: your environment is network-sandboxed
with a fixed domain allowlist that doesn't include `ship.embarko.ai`. This is
common in hosted AI coding tools. Retrying, or trying a slightly different
URL, changes nothing. Two or three failures of the same shape mean this, not
a flaky network.

1. **Use the Embarko connector if you have one.** If your tool lists an MCP
   connector named **Embarko**, use it. Its requests come from the connector
   service, not your sandbox, so the block doesn't apply. It needs the app's
   source at a public `.tar.gz` URL, not an upload. See
   [the connector](capabilities.md#mcp-connector) for what it can and can't
   do.
2. **No connector? Say so plainly.** Tell the user your environment can't
   reach Embarko's API. Don't say the deploy failed: that sends them looking
   for a bug in their app.
3. **Offer the connector fix.** If their AI tool supports MCP connectors
   (Claude, Claude Code, or a ChatGPT tier with custom MCP connections),
   connecting one named **Embarko** makes future deploys work in the chat.
   Give them the link for their tool from [Connectors](connectors.md).
4. **Leave them something that works.** Give them a script to run on their
   own machine, which has normal network access:

   ```bash
   tar -czf /tmp/app.tar.gz --exclude=node_modules --exclude=.git \
     --exclude='.env*' -C /path/to/app .

   curl -X POST "https://ship.embarko.ai/apps" \
     -H "X-App-Name: my-app" \
     -F "source=@/tmp/app.tar.gz"

   curl "https://ship.embarko.ai/apps/my-app/status"   # poll until not in_progress
   ```

**Don't fall back to an anonymous deploy** because an authenticated one was
blocked. Network and credentials are separate problems. Falling back gives
the user a temporary app they didn't ask for, deleted in 24 hours. And if the
token path is blocked, the anonymous path is too: it is the same host.

---

## [How do I roll back?](#rollback)

1. **List the history.** Needs a deploy token:

   ```bash
   curl "https://ship.embarko.ai/api/apps/my-app/deployments" \
     -H "Authorization: Bearer $DEPLOY_TOKEN"
   ```

   Only entries with status `success` are valid targets.
2. **Pick the target with care.** Choose the newest `success` *before* the
   bad one, not just the previous entry. That may be a failure or another bad
   deploy. Note its **id**.
3. **Roll back to that id.** `deploymentId` picks the version. Send `{}`
   instead to go back to the previous good build:

   ```bash
   curl -X POST "https://ship.embarko.ai/api/apps/my-app/rollback" \
     -H "Authorization: Bearer $DEPLOY_TOKEN" -H "Content-Type: application/json" \
     -d '{"deploymentId": "<deploymentId>"}'
   ```

4. **Poll the returned deployment** until it leaves `in_progress`. It answers
   `202` at once, but the switch is not instant.
5. **Check** the URL serves the old version. Tell the user what you rolled
   back to and why.

**Good to know**

- **`422 rollback_image_unavailable`:** the image was pruned. `retainCount`
  says how many deploys back you can still reach. Pick a target within that,
  or redeploy the old source from git.
- **Rollback doesn't restore env vars or domains.** It reruns the old image
  with *today's* settings.
- **Rollback doesn't rewrite history.** It adds a new entry.
- **Rollback doesn't recover data.** `DATA_DIR` is untouched and has no
  backup.

---

## [How do I add a secret?](#add-secret)

1. **Get the value from the user.** This is a valid reason to ask: you can't
   invent an API key. Ask directly and don't log it.
2. **Write it.** Needs a deploy token. The key must match
   `^[A-Za-z_][A-Za-z0-9_]*$`:

   ```bash
   curl -X PUT "https://ship.embarko.ai/api/apps/my-app/env-vars/STRIPE_KEY" \
     -H "Authorization: Bearer $DEPLOY_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"value": "sk_live_..."}'
   ```

3. **Apply it. Don't skip this.** A write only stores the value. The running
   app keeps the old one until you apply:

   ```bash
   curl -X POST "https://ship.embarko.ai/api/apps/my-app/env-vars/apply" \
     -H "Authorization: Bearer $DEPLOY_TOKEN"
   ```

   A redeploy also picks it up. `apply` is faster because it skips the build.
4. **Confirm by behavior, not by reading it back.** Values are write-only:
   `GET /env-vars` returns keys only. Test the feature that uses the secret.
5. **Make sure it isn't in the source too.** If the key was committed, or sat
   in a `.env` file you packaged, it is in the deployed image. Remove it,
   redeploy, and tell the user to rotate it.

---

## [How do I add a custom domain?](#add-custom-domain)

You do every step except **creating the DNS record**, which lives in the
user's registrar account. Do your parts without asking. Give them one precise
task.

1. **Advise on the shape first.** A subdomain (`app.theirdomain.com`) is
   better than an apex (`theirdomain.com`). An apex gets an `A` record
   straight to the origin and loses any CDN or DDoS proxy in front. Say this
   before they pick.
2. **Register the domain** and read the record it returns:

   ```bash
   curl -X POST "https://ship.embarko.ai/api/apps/my-app/domains" \
     -H "Authorization: Bearer $DEPLOY_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"domain": "app.yourdomain.com"}'
   ```

   Nothing is live yet. This only reserves the domain and gives you the
   record.
3. **Give the user exactly that record:** type, name, value. Add the part
   they will otherwise get wrong: **on Cloudflare it must be DNS-only (grey
   cloud), not Proxied (orange cloud).** A proxied record never verifies.
4. **Verify, and keep verifying.** Safe to repeat while DNS spreads:

   ```bash
   curl -X POST "https://ship.embarko.ai/api/apps/my-app/domains/app.yourdomain.com/verify" \
     -H "Authorization: Bearer $DEPLOY_TOKEN"
   ```

   Routing turns on only when this confirms. Poll it. Don't ask the user if
   they're done.
5. **If it never verifies,** it is almost always one of three:
   - the record is proxied;
   - the record doesn't match exactly;
   - port 80 is blocked or redirected for that hostname. Certificate issuance
     uses an HTTP-01 challenge and needs it open.

   See
   [troubleshoot.md](troubleshoot.md#verify-stuck-on-not-resolving-yet-despite-a-correct-looking-record).
6. **Confirm it works,** then tell them. The default
   `<app-name>.embarko.app` URL keeps working the whole time and after.

**Good to know**

- `GET /api/apps/<name>/domains` lists registered domains.
- `DELETE /api/apps/<name>/domains/<domain>` removes one. The default URL is
  not affected.

---

## [How do I delete an app?](#delete-app)

Deleting can't be undone and there is no backup. The API can do it, but you
must still confirm first.

1. **Confirm with the user first.** Name the app and what goes with it: the
   running app, its URL, and all data under `DATA_DIR`. Don't infer this from
   a vague request.
2. **Delete, sending the name again as confirmation:**

   ```bash
   curl -X DELETE "https://ship.embarko.ai/api/apps/my-app" \
     -H "Authorization: Bearer $DEPLOY_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"confirmAppName": "my-app"}'
   ```

   `400 confirmation_required` means the name was missing or wrong. Nothing
   was deleted.
3. **Tell them the name is released.** Someone else can now take that
   subdomain.

---

## [How do I rename an app?](#rename-app)

1. **Know what changes.** Only the **display name**. The slug is the live URL
   and `PATCH` doesn't move it. Say so first, or they'll expect the URL to
   change. If they want the URL changed, that is a different, much heavier
   call: [change the web address](#change-address).
2. **Rename:**

   ```bash
   curl -X PATCH "https://ship.embarko.ai/api/apps/my-app" \
     -H "Authorization: Bearer $DEPLOY_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name": "My App"}'
   ```

3. **Keep using the original slug** for every other call.

---

## [How do I change an app's web address?](#change-address)

This moves the URL. A [rename](#rename-app) only changes the label.

1. **Ask first, every time.** The old address stops working as soon as the
   new one is live. There is no redirect. Links to it break. Someone else can
   claim the freed name. A name that looks untidy to you is not a reason. A
   user asking for a new address is.
2. **Tell them** the app will be offline for a few minutes and keeps its
   data.
3. **Change it:**

   ```bash
   curl -X POST "https://ship.embarko.ai/api/apps/my-app/slug-change" \
     -H "Authorization: Bearer $DEPLOY_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"newName": "my-better-app"}'
   ```

4. **Poll the `statusUrl` it returns** until `terminal` is true. This takes
   minutes, because the app needs a new certificate for the new hostname.
   `state` ends as `succeeded` or `failed`. `currentSlug` always says where
   the app is. A failure leaves it on the old address, untouched.
5. **Use the new name from now on.** `deployWith` in the response gives the
   exact `X-App-Name`. Forgetting this is the usual way things break after a
   move.
6. **Tell them what doesn't break.** A custom domain carries over and keeps
   working, so their real address is unaffected. A Showcase listing keeps
   its own separate URL.

**Good to know**

- **`404 app_renamed`: follow it, don't redeploy.** You are using a stale
  name. The response has `newName` and a `retryUrl`. Deploying under the old
  name would create a second, empty app.
- **Once a week per app.** Otherwise `429 slug_change_cooldown`, with
  `retryAfterMs`. Each change uses a certificate from a budget shared with
  every new app.

---

## [How do I report how an app is doing?](#analytics)

1. **Fetch traffic and resource usage:**

   ```bash
   curl "https://ship.embarko.ai/api/apps/my-app/analytics?range=7d" \
     -H "Authorization: Bearer $DEPLOY_TOKEN"
   ```

   `range` is `24h`, `7d`, `30d`, `90d` or `all` (default `24h`).
2. **A `503` is not zero traffic.** It means analytics is unreachable. Say
   that. Don't report that the app had no visitors.
3. **Summarize in their terms:** requests, errors, and whether it is near its
   memory limit. Not raw numbers.

---

## [How do I choose how to authenticate?](#choose-auth)

A first deploy can be anonymous, but then the app is deleted after 24 hours.
Get access before the first deploy if you can. Use the first option that
works, and ask the user only once:

| Option | When to use | Result |
|---|---|---|
| Embarko connector | It is in your tools | Acts as the signed-in person; no token |
| Existing token | `$DEPLOY_TOKEN` or `~/.embarko/credentials` is set | Use it as is |
| Token by email | No connector, no token, no browser | Person pastes the emailed token |
| Sign in at embarko.ai | The person prefers the dashboard | Person creates a token and pastes it |

The ways in are explained in [Authentication](capabilities.md#agent-auth).

1. **Embarko connector in your tools?** Use it. It acts as the signed-in
   person, so there is no token to find. Apps it deploys are in their account
   from the start, with nothing to claim.
2. **Token already set?** Check `$DEPLOY_TOKEN`, then
   `~/.embarko/credentials`. Use it. Don't request another.
3. **Neither? Request a token by email.** Follow steps 2 to 4 of
   [Make an anonymous app permanent](#claim).
4. **Or the person signs in.** Ask them to sign in at
   `https://embarko.ai/app/tokens`, create a token, and paste it to you.
   Offer this or step 3, whichever suits them. Both give the same account as
   long as it is the same email.
5. **Offer the connector for next time.** If their AI tool is on
   [Connectors](connectors.md), give them the link in one sentence:
   connecting once means no more tokens. Don't block the current task on it.

---

## [How do I make an anonymous app permanent?](#claim)

An app deployed without a token is deleted 24 hours after it was created.
Claiming it cancels that.

1. **Check for a token you already have:** `$DEPLOY_TOKEN`, then
   `~/.embarko/credentials`. The full order, connector first, is in
   [Choose how to authenticate](#choose-auth).
2. **No token? Request one by email.** Confirm the address with the user
   first: whoever reads that inbox gets the token.

   ```bash
   curl -X POST "https://ship.embarko.ai/api/public/deploy-tokens/request" \
     -H "Content-Type: application/json" \
     -d '{"email": "them@example.com"}'
   ```

   Call this **once**. It always returns `202`, whether or not it worked, so
   retrying tells you nothing and uses up the rate limit.
3. **Ask them to paste the token back.** It is emailed, never returned in the
   response. You can't read it yourself. If they'd rather, they can sign in
   at `https://embarko.ai/app/tokens`, create a token and paste that.
4. **Save it** to `~/.embarko/credentials` (`chmod 600`) and export
   `DEPLOY_TOKEN`, so later deploys skip this.
5. **Redeploy the same app name with the token.** That claims it. The expiry
   is cancelled and it becomes a normal app, with no trace of being
   anonymous.
6. **Confirm** the deploy succeeded. Tell the user the app is now permanent.

**Good to know**

- **Rate limits on the email request:** 5 per hour per email, 10 per hour
  per IP.
- **Always `202`.** Don't call again to check it worked.

---

## [What if the app is live but misbehaving?](#app-broken)

The deploy succeeded, so this is a runtime problem, not a build problem.

1. **Check that it is running:** `GET .../status`. `health` describes the app
   right now, separate from the last deploy.
2. **Read the runtime logs,** stderr first. Look above any crash-loop line
   for the real cause.
3. **If it's OOM** (`Exit Code: 137`): 256MB is fixed and can't be raised
   today. Shrink the footprint: production start command, drop unused
   dependencies, don't hold large data in memory.
4. **If data vanished:** it was written outside `DATA_DIR`. Everything
   outside it resets on every deploy. Move the path and redeploy.
5. **If it worked before the last deploy,** [roll back](#rollback) to restore
   service first, then debug.

---

## [Related](#related)

- [API contract](api.md): exact parameters, responses, errors, retry rules.
- [Capabilities](capabilities.md): what exists, with limits.
- [Connectors](connectors.md): the link to add Embarko to each AI tool.
- [Troubleshooting](troubleshoot.md): every error code and its fix.
- [Overview](overview.md): what Embarko is and when to choose it.
