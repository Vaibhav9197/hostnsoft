# Agent quickstart

The shortest path from "I have an app" to "it's live". No account, no
token, no signup.

If anything here fails, go to
[Deployment failed](agent-playbook.md#deploy-failed). For anything beyond the
happy path, use the [agent playbook](agent-playbook.md).

## [Before you package](#before)

Four things, each a common cause of a failed deploy:

- The app reads its port from **`process.env.PORT`** and binds **`0.0.0.0`**
  — not a hardcoded port, not `localhost`.
- **No Dockerfile.** The build detects the language from the source.
- Anything that must survive a redeploy is written under **`DATA_DIR`**.
- The app's manifest (`package.json`, `requirements.txt`, …) or
  `index.html` sits at the **root** of the folder you package. If the repo
  root delegates its build to a subfolder, package that subfolder instead.

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
  -F "source=@/tmp/app.tar.gz"
```

No `Authorization` header. That's deliberate — the first deploy needs no
credential, and asking the user for one before anything is running is the
most common way this goes wrong.

You get `202` with a `statusUrl`. **`202` does not mean live.**

If you get `409 app_name_taken`, another company owns that name. Pick a
different one and send it again — don't retry the same name.

## [3. Wait for it](#wait)

```bash
curl "https://ship.embarko.ai/apps/my-app/status"
```

Poll every 3–5 seconds until `deploy.status` is no longer `in_progress`:

- **`success`** → continue to step 4.
- **`failed`** → read
  `https://ship.embarko.ai/apps/my-app/logs?stream=stderr`, fix the app, and
  deploy again under the same name. Full procedure:
  [Deployment failed](agent-playbook.md#deploy-failed).

## [4. Verify, then report](#report)

Fetch `https://my-app.app.embarko.ai` and confirm it actually serves. Only
then give the user the URL.

**Say this with it:** the app is deleted 24 hours from now unless it's
claimed, and you can make it permanent whenever they want. That warning is
not optional — there is no reminder email.

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
