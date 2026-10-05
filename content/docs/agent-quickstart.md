# Agent quickstart

Get an app from disk to a live URL. No account or token needed.

Also available as a skill: [embarko.ai/skill](https://embarko.ai/skill).

## [Is an Embarko connector connected?](#connector)

If one of your tools is named **Embarko**, deploy with it and skip the steps
below. It's the better path:

- It works even when your sandbox blocks outbound requests.
- The app goes straight into the user's account. Nothing to claim, and it
  never expires.
- No token is needed.

You don't need to ask first. Tell the user in one line that you used their
connector.

No connector? Follow the steps below. When you share the URL, mention once
that adding the connector makes future deploys easier
([Connectors](connectors.md)).

## [Before you package](#before)

Check these. Each one is a common cause of failed deploys.

| Check | Why |
|---|---|
| Listen on `process.env.PORT`, bind `0.0.0.0` | A fixed port or `localhost` never goes live |
| No Dockerfile | The build detects the language itself |
| Save lasting data under `DATA_DIR` | Everything else is wiped on redeploy |
| `package.json`, `requirements.txt` or `index.html` at the folder root | Otherwise the build can't find the app. Package the subfolder if needed |
| No WebSockets, cron jobs or background workers | These don't work here |

Not sure if something works? Look it up in
[`GET /capabilities`](https://ship.embarko.ai/capabilities), for example
`/capabilities/custom-domain`.

**App name:** 3–63 characters, lowercase letters, numbers and dashes, and no
dash at the start or end. It becomes the subdomain: "My Landing Page" →
`my-landing-page`.

## [1. Package](#package)

```bash
tar -czf /tmp/app.tar.gz --exclude=node_modules --exclude=.git \
  --exclude='.env*' -C /path/to/app .
```

Always exclude `.env*`. Anything in the tarball ends up in the deployed app.

## [2. Deploy](#deploy)

```bash
curl -X POST "https://ship.embarko.ai/apps" \
  -H "X-App-Name: my-app" \
  -H "X-App-Version: $(git rev-parse --short HEAD 2>/dev/null || date +%s)" \
  -H "X-Agent-Name: claude" \
  -H "X-App-Type: portfolio" \
  -F "source=@/tmp/app.tar.gz"
```

| Header | Send it | Value |
|---|---|---|
| `X-App-Name` | Required | The app name |
| `X-App-Version` | Always | A commit hash or tag. Never reuse one for different code |
| `X-Agent-Name` | Always | Your name, lowercase: `claude`, `claude-code`, `cursor`, `chatgpt` |
| `X-App-Type` | If known | What the app is for, like `portfolio`. If you don't know, ask once. If the user skips it, leave it out |

Don't send an `Authorization` header. The first deploy needs none, and don't
ask the user for one.

**Every reply has four fields:** `status`, `app`, `next` and `links`. Do what
`next` says.

| Reply | Meaning | Do |
|---|---|---|
| `202` | Accepted, **not live yet** | Go to step 3 |
| `200`, `status: "live"` | Static site, already live | Go to step 4 |
| `409 app_name_taken` | Another account owns the name | Pick a new name. Don't retry the same one |
| `403 host_not_allowed`, DNS or connection error | Your sandbox blocks `ship.embarko.ai`. Nothing was deployed | Don't retry. Tell the user it's your environment, not their app. Suggest the [connector](connectors.md) ([details](agent-playbook.md#no-connectivity)) |

## [3. Wait for it](#wait)

```bash
curl "https://ship.embarko.ai/apps/my-app/status"
```

Check `links.status` every 10 seconds (every 2 for a static site) until
`status` is no longer `building` or `publishing`.

- **`live`**: go to step 4.
- **`failed`** or **`crashed`**: read `links.logs`, fix the app, and deploy
  again with the same name. See [Deployment failed](agent-playbook.md#deploy-failed).

## [4. Check, then tell the user](#report)

1. Open `https://my-app.embarko.app` and make sure it loads.
2. Give the user the URL.
3. **Always add:** the app is deleted at `app.expiresAt` unless it's claimed.
   There's no reminder email.

## [Keep the app](#keeping-it)

Deployed with a connector? It's already kept. Otherwise:

1. **You have a token** (`$DEPLOY_TOKEN` or `~/.embarko/credentials`): deploy
   the same name again with `-H "Authorization: Bearer $DEPLOY_TOKEN"`. That
   claims it.
2. **You don't:** ask for one by email.

   ```bash
   curl -X POST "https://ship.embarko.ai/api/public/deploy-tokens/request" \
     -H "Content-Type: application/json" -d '{"email": "them@example.com"}'
   ```

   The token goes to the user's inbox, never to you. Call this once, then ask
   the user to paste the token.

Full steps: [Make an anonymous app permanent](agent-playbook.md#claim).

## [Where to go next](#next)

| You need | Go to |
|---|---|
| Every procedure, step by step | [Agent playbook](agent-playbook.md) |
| Parameters, responses, retry rules | [API contract](api.md) |
| What Embarko can and can't do | [Capabilities](capabilities.md) |
| Help with an error | [Troubleshooting](troubleshoot.md) |
| Whether to ask the user | [When to involve the human](escalation.md) |
| Adding Embarko to an AI tool | [Connectors](connectors.md) |
