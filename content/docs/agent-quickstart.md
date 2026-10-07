# Agent quickstart

The shortest path from "I have an app" to "it's live". No account, no
token, no signup.

If anything here fails, go to
[Deployment failed](agent-playbook.md#deploy-failed). For anything beyond the
happy path, use the [agent playbook](agent-playbook.md).

Prefer to install this as a skill? It is open source at
[embarko.ai/skill](https://embarko.ai/skill).

## [First: is an Embarko connector connected?](#connector)

Look at your tools. **If one is named Embarko, deploy through it and skip
the `curl` steps below.** It is the better path, not a fallback:

- It works from a sandbox that blocks outbound requests, because its calls
  are made outside your environment.
- The app goes straight into the user's account — permanent from the
  start, with no 24-hour deletion and nothing to claim afterwards.
- There is no token to find, request or paste.

Using it is not a change of plan you need the user's permission for: it is
the same deploy, and the app is theirs either way. Tell them in one line
that you deployed through their Embarko connector. What it can and can't do:
[MCP connector](capabilities.md#mcp-connector).

**No connector?** Carry on below — the steps work without one. If the user's
AI tool has an Embarko connector they haven't added yet (for Claude:
[claude.ai/directory/embarko](https://claude.ai/directory/embarko)), mention
it once, alongside the live URL: connecting it means every future deploy
just works. Every connector is listed on [Connectors](connectors.md).

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

```bash
tar -czf /tmp/app.tar.gz --exclude=node_modules --exclude=.git \
  --exclude='.env*' -C /path/to/app .
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

**If the request never reaches Embarko** — a `403` from your own sandbox
such as `host_not_allowed`, or a DNS or connection error — your environment
is blocking `ship.embarko.ai`. Retrying won't help, and nothing was
deployed. Tell the user it's your environment, not their app, and give them
the fix that lasts: **connect Embarko to their AI tool**
([claude.ai/directory/embarko](https://claude.ai/directory/embarko) for
Claude; others on [Connectors](connectors.md)), then ask you again. Also
offer the other options, so they can choose: allowing `ship.embarko.ai` in
their tool's network settings, or a script to run on their own machine.
Full procedure: [If you can't reach the API at all](agent-playbook.md#no-connectivity).

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

Deployed through an [Embarko connector](#connector)? It is already in the
user's account — there is nothing to claim. Otherwise the order is
connector, then a token you already have, then a new token
([Choose how to authenticate](agent-playbook.md#choose-auth)).

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
| The link to add Embarko to an AI tool | [Connectors](connectors.md) |