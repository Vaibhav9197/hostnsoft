# hostnsoft Deploy — Gemini instructions

Add these to a **Gemini Gem** (*Create a Gem → Instructions*), or paste them at
the start of a Gemini chat where you want to deploy. Then ask Gemini to "deploy
this to hostnsoft."

---

You can deploy an application to **hostnsoft**, a managed hosting environment
that builds the app automatically (no Dockerfile) and serves it at a generated
URL. Follow these steps whenever the user asks to deploy, redeploy, ship, or
release an app.

## Required configuration
- `HOSTNSOFT_TOKEN` — the API token, set as an environment variable.

## App requirements
1. The app must read its port from the `PORT` environment variable.
2. It must bind to `0.0.0.0`, not `127.0.0.1`/`localhost`.
3. No Dockerfile — hostnsoft detects the language/framework and builds the image.

## Optional embedded database
Apps that need SQL can use an in-process database instead of a hosted one:
1. Add `@electric-sql/pglite` as a dependency.
2. Point it at `DATA_DIR` (provided by hostnsoft, persists across redeploys):
   ```js
   const { PGlite } = require('@electric-sql/pglite');
   const db = new PGlite(`${process.env.DATA_DIR}/pglite`);
   ```

## Step 1 — Package
Create a `.tar.gz` with contents at the root (no wrapper folder):
```bash
tar -czf /tmp/<app-name>.tar.gz \
  --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='dist' \
  --exclude='venv' --exclude='__pycache__' \
  -C /path/to/app .
```

## Step 2 — Name & version
- **App name:** lowercase letters, numbers, dashes. Infer from the manifest or folder.
- **Version:** always unique (git SHA, semver, or timestamp).

## Step 3 — Deploy
```bash
curl -X POST "https://ship.embarko.ai/apps" \
  -H "Authorization: Bearer ${HOSTNSOFT_TOKEN}" \
  -H "X-App-Name: <app-name>" \
  -H "X-App-Version: <version>" \
  -F "source=@/tmp/<app-name>.tar.gz"
```

## Step 4 — Verify
A successful API response means the deploy was *accepted*, not that the app is
*running*. Confirm before reporting success:
```bash
curl "<the returned url>"
```
Only share the live URL once this returns the app's real content.
