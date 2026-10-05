# Agent quickstart

**Faster, if your tools let you install one:**

```bash
npx skills add embarko-ai/skill --skill embarko-deploy -g
```

The skill packages and deploys for you. Source: [embarko.ai/skill](https://embarko.ai/skill).

No skill? Deploy an app and get a live URL by doing the steps in order.

## [1. Get access](#connector)

Use the first option that works:

| # | You have | Do |
|---|---|---|
| 1 | A tool named **Embarko** in your tools | Use it to deploy. Go to [step 2](#before). No token needed |
| 2 | A saved token: `$DEPLOY_TOKEN`, or the first line of `~/.embarko/credentials` | Send `-H "Authorization: Bearer $DEPLOY_TOKEN"` on every call |
| 3 | Neither | Ask the user once (below) |

**Using the connector?** Tell the user in one line that you used it.

**Asking the user:** offer these choices in one message.

1. **Add the Embarko connector.** Best for every future deploy. For Claude:
   [claude.ai/directory/embarko](https://claude.ai/directory/embarko). Other
   tools: [Connectors](connectors.md).
2. **Get a token by email.** Ask for their email and confirm it. Then call
   this **once**:

   ```bash
   curl -X POST "https://ship.embarko.ai/api/public/deploy-tokens/request" \
     -H "Content-Type: application/json" -d '{"email": "them@example.com"}'
   ```

   It always returns `202`. The token goes to their inbox, never to you. Ask
   them to paste it.
3. **Create a token in the dashboard.** They sign in at
   [embarko.ai/app/tokens](https://embarko.ai/app/tokens), create a token,
   and paste it.
4. **Skip for now.** Deploy without a token. The app is deleted 24 hours
   later unless it's kept ([step 7](#keeping-it)).

**Got a token?** Save it so nobody is asked again:

```bash
mkdir -p ~/.embarko && echo "<token>" > ~/.embarko/credentials \
  && chmod 600 ~/.embarko/credentials && export DEPLOY_TOKEN="<token>"
```

**Good to know**

- **Never send an empty `Authorization` header.** No token means no header.
  An empty or wrong token is a hard `401`, not an anonymous deploy.
- **Token by email: call it once.** Limits are 5 per hour per email and 10 per
  hour per IP. The reply is `202` either way, so a retry tells you nothing.

More: [Authentication](capabilities.md#agent-auth).

## [2. Check the app](#before)

Each of these is a common cause of failed deploys:

| Check | Why |
|---|---|
| Listen on `process.env.PORT`, bind `0.0.0.0` | A fixed port or `localhost` never goes live |
| No Dockerfile | The build detects the language itself |
| Save lasting data under `DATA_DIR` | Everything else is wiped on redeploy |
| `package.json`, `requirements.txt` or `index.html` at the folder root | Otherwise the build can't find the app. Package the subfolder if needed |
| No WebSockets, cron jobs or background workers | These don't work here |

Not sure something works? Look it up in
[`GET /capabilities`](https://ship.embarko.ai/capabilities), for example
`/capabilities/custom-domain`.

**App name:** 3–63 characters, lowercase letters, numbers and dashes, with no
dash at the start or end. It becomes the subdomain: "My Landing Page" →
`my-landing-page`.

## [3. Package](#package)

Always exclude `.env*`. Anything in the tarball ends up in the deployed app.

```bash
tar -czf /tmp/app.tar.gz --exclude=node_modules --exclude=.git \
  --exclude='.env*' -C /path/to/app .
```

## [4. Deploy](#deploy)

Leave out the `Authorization` line if you have no token.

```bash
curl -X POST "https://ship.embarko.ai/apps" \
  -H "Authorization: Bearer $DEPLOY_TOKEN" \
  -H "X-App-Name: my-app" \
  -H "X-App-Version: $(git rev-parse --short HEAD 2>/dev/null || date +%s)" \
  -H "X-Agent-Name: claude" \
  -H "X-App-Type: portfolio" \
  -F "source=@/tmp/app.tar.gz"
```

| Header | Send it | Value |
|---|---|---|
| `X-App-Name` | Required | The app name. The same name again updates the app |
| `X-App-Version` | Always | A commit hash or tag. Never reuse one for different code |
| `X-Agent-Name` | Always | Your name, lowercase: `claude`, `claude-code`, `cursor`, `chatgpt` |
| `X-App-Type` | If known | What the app is for, like `portfolio`. Never ask for it. Leave it out if you don't know |

Do what `next` in the reply says.

| Reply | Meaning | Do |
|---|---|---|
| `202` | Accepted, **not live yet** | Go to step 5 |
| `200`, `status: "live"` | Static site, already live | Go to step 6 |
| `409 app_name_taken` | Another account owns the name | Pick a new name. Don't retry the same one |
| `403 host_not_allowed`, DNS or connection error | Your sandbox blocks `ship.embarko.ai`. Nothing was deployed | Don't retry. Tell the user it's your environment, not their app. Suggest the [connector](connectors.md) ([details](agent-playbook.md#no-connectivity)) |

## [5. Wait until it's live](#wait)

```bash
curl "https://ship.embarko.ai/apps/my-app/status"
```

Check `links.status` every 10 seconds until
`status` is no longer `building` or `publishing`.

- **`live`**: go to step 6.
- **`failed`** or **`crashed`**: read `links.logs`, fix the app, and deploy
  again with the same name. See [Deployment failed](agent-playbook.md#deploy-failed).

## [6. Check it, then tell the user](#report)

1. Open `https://my-app.embarko.app` and make sure it loads.
2. Give the user the URL.
3. **Deployed without a token?** Always add: the app is deleted at
   `app.expiresAt` unless it's kept. There's no reminder email.

## [7. Keep an app deployed without a token](#keeping-it)

Get a token (step 1) and deploy the same name again with it. Full steps:
[Make an anonymous app permanent](agent-playbook.md#claim).

## [Where to go next](#next)

| You need | Go to |
|---|---|
| Every procedure, step by step | [Agent playbook](agent-playbook.md) |
| Parameters, responses, retry rules | [API contract](api.md) |
| What Embarko can and can't do | [Capabilities](capabilities.md) |
| Help with an error | [Troubleshooting](troubleshoot.md) |
| Whether to ask the user | [When to involve the human](escalation.md) |
| Adding Embarko to an AI tool | [Connectors](connectors.md) |
