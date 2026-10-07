# Agent quickstart

The shortest path from "I have an app" to "it's live". No account, no
token, no signup.

If anything here fails, go to
[Deployment failed](agent-playbook.md#deploy-failed). For anything beyond the
happy path, use the [agent playbook](agent-playbook.md).

Prefer to install this as a skill? It is open source at
[embarko.ai/skill](https://embarko.ai/skill).

## [Before you package](#before)

Four things, each a common cause of a failed deploy:

- The app reads its port from **`process.env.PORT`** and binds **`0.0.0.0`**
  — not a hardcoded port, not `localhost`.
- **No Dockerfile.** The build detects the language from the source.
- Anything that must survive a redeploy is written under **`DATA_DIR`**.
- The app's manifest (`package.json`, `requirements.txt`, …) or
  `index.html` sits at the **root** of the folder you package. If the repo
  root delegates its build to a subfolder, package that subfolder instead.
- It doesn't need WebSockets, cron jobs or background workers, which don't
  work here. For any "can Embarko do X?" question, open the one topic you
  need from the contents page at
  [`GET /capabilities`](https://ship.embarko.ai/capabilities), for example
  `/capabilities/custom-domain`.

Pick a name while you're here: lowercase letters, numbers and dashes, 3–63
characters, not starting or ending with a dash. It becomes the public subdomain, so slugify anything in prose —
"My Landing Page" → `my-landing-page`.

## [1. Package](#package)

Leave out anything the build makes or downloads on its own, and anything
secret. Look at the actual folders in the project and decide for each one.
Typical ones:

- installed packages, such as `node_modules`, `vendor`, or a Python virtual
  environment under any name
- build output, meaning files a build step generated from the source, such as
  `dist`, `.next`, `target`, or `_build`
- caches, such as `__pycache__`, `.cache`, or `.pytest_cache`
- version history, meaning the `.git` folder
- secrets, meaning any `.env` file

Check what a folder holds before you exclude it. A folder named `build`,
`vendor`, or `lib` can hold source code. Exclude a folder only if the build
can make it again.

Keep source code, config files, lock files, tool wrappers such as `mvnw` and
the `.mvn` folder, and the build manifest, such as `package.json`,
`requirements.txt`, `go.mod`, or `Cargo.toml`. The build needs those.

Then pack with one exclude per item. Write names without a trailing slash,
since tar ignores a pattern like `vendor/`. Replace the examples with what
your project actually has:

```bash
tar -czf /tmp/app.tar.gz \
  --exclude=.git --exclude='.env*' \
  --exclude=node_modules --exclude=dist \
  -C /path/to/app .
```

Excluding `.env*` matters: secrets in the tarball end up in the deployed
image.

## [2. Deploy](#deploy)

```bash
curl -X POST "https://ship.embarko.ai/apps" \
  -H "X-App-Name: my-app" \
  -H "X-App-Version: $(git rev-parse --short HEAD 2>/dev/null || date +%s)" \
  -H "X-App-Type: portfolio" \
  -H "X-Agent-Name: claude" \
  -F "source=@/tmp/app.tar.gz"
```

`X-Agent-Name` is your own name as an agent, in lowercase (`claude-code`,
`claude`, `chatgpt`, `cursor`...). It shows the owner which agent deployed
the app. Always send it.

`X-App-Type` is optional. It says what the app is for, for example
`personal website`, `portfolio`, `task management` or `feedback system`.
If you already know, set it. If you don't, ask the user once and tell them
they can skip it. If they skip it, leave the header out.

No `Authorization` header. That's deliberate — the first deploy needs no
credential, and asking the user for one before anything is running is the
most common way this goes wrong.

You get `202`. **`202` does not mean live.** Every reply from here on has
the same four fields: `status` (where things stand), `app`, `next` (the one
thing to do now) and `links` (the URLs `next` refers to, always including
`links.feedback`). Follow `next`.

A plain static site (just `index.html` and assets) is published while the
request waits, usually in about a second, so the reply is already the result:
`200` with `status: "live"`, and `next` goes straight to the claim step (or
the showcase, once claimed). A very large site that takes longer than a few
seconds gets `202` with `status: "publishing"` instead: check `links.status`.
It has no logs and takes no env vars, because nothing runs on the server.

If you get `409 app_name_taken`, another company owns that name. Pick a
different one and send it again — don't retry the same name.

## [3. Wait for it](#wait)

```bash
curl "https://ship.embarko.ai/apps/my-app/status"
```

Skip this if the deploy reply already says `status: "live"` (a static site
usually does). Otherwise poll `links.status` every 10 seconds (2 for a static
site) until `status` is no longer `building` or `publishing`:

- **`live`** → continue to step 4.
- **`failed`** or **`crashed`** → read `links.logs` from the same reply, fix
  the app, and deploy again under the same name. Full procedure:
  [Deployment failed](agent-playbook.md#deploy-failed).

## [4. Verify, then report](#report)

Fetch `https://my-app.embarko.app` and confirm it actually serves. Only
then give the user the URL.

**Say this with it:** the app is deleted at `app.expiresAt` unless it's
claimed, and you can make it permanent whenever they want. The live status
reply's `next` spells out how. That warning is not optional — there is no
reminder email.

## [Keeping it](#keeping-it)

To make it permanent, the app needs a deploy token. Check `$DEPLOY_TOKEN`
and `~/.embarko/credentials` first — if one exists, just redeploy the same
name with `-H "Authorization: Bearer $DEPLOY_TOKEN"` and it's claimed.

If not, request one by email (it's mailed to the user, never returned to
you):

```bash
curl -X POST "https://ship.embarko.ai/api/public/deploy-tokens/request" \
  -H "Content-Type: application/json" -d '{"email": "them@example.com"}'
```

Full procedure: [Make an anonymous app permanent](agent-playbook.md#claim).

## [What's next](#next)

| You need | Go to |
| --- | --- |
| Every procedure, in order | [Agent playbook](agent-playbook.md) |
| Exact parameters, responses, retry rules | [API contract](api.md) |
| What Embarko can and can't do | [Capabilities](capabilities.md) |
| An error code you hit | [Troubleshooting](troubleshoot.md) |
| Whether to ask the user something | [When to involve the human](escalation.md) |
