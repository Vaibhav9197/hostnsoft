# Embarko Deploy — Cursor / Windsurf / agent IDE rule

Save this in your project as an agent rule so any AI IDE can deploy:
- **Cursor:** `.cursor/rules/embarko-deploy.md`
- **Windsurf / others:** `AGENTS.md` at the repo root.

Then tell the agent to "deploy this to Embarko."

---

You can deploy this application to **Embarko**, a managed hosting environment
that builds the app automatically (no Dockerfile) and serves it at a generated
URL. Follow these steps whenever asked to deploy, redeploy, ship, or release.

## Required configuration
- `DEPLOY_TOKEN` — the API token, set as an environment variable.

## App requirements
1. The app must read its port from the `PORT` environment variable.
2. It must bind to `0.0.0.0`, not `127.0.0.1`/`localhost`.
3. No Dockerfile — Embarko detects the language/framework and builds the image.

## Optional embedded database
Apps that need SQL can use an in-process database instead of a hosted one:
1. Add `@electric-sql/pglite` as a dependency.
2. Point it at `DATA_DIR` (provided by Embarko, persists across redeploys):
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
  -H "Authorization: Bearer ${DEPLOY_TOKEN}" \
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
