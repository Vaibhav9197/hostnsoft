# Embarko Deploy Troubleshooting

Real failures the deploy API has thrown, not hypotheticals. Each entry: `match` (exact substring to
look for in a response body or `GET .../logs` output) → `cause` → `fix`.

## Build-time rejections (before any build runs)

### 422 unsupported_storage_pattern
- match: `"window.storage"` in the 422 response detail
- cause: app calls `window.storage`, a Claude Artifacts sandbox API that doesn't exist outside it
- fix: replace with SQLite (`better-sqlite3`), writing under `DATA_DIR`, then redeploy

### 401 unauthorized
- match: `{"error":"Unauthorized","code":"unauthorized"}`
- cause: `Authorization` header present but token invalid/revoked. Omitting the header entirely = anonymous
  deploy (fine). Sending a broken one is never silently treated as anonymous.
- fix: verify the token is live and not rotated/revoked, or omit the header entirely for an anonymous deploy

### 409 app_name_taken
- match: `"already in use by a different company"`
- cause: `X-App-Name` is also the live subdomain — must be unique across the whole platform, not just your account
- fix: pick a different `X-App-Name`, or claim the existing orphan with a real token before its 24h expiry

### 422 no_manifest_at_root
- match: `"code":"no_manifest_at_root"` in the 422 response
- cause: the uploaded archive's app files are nested inside a subfolder instead of sitting at its top
  level (e.g. an extra wrapping folder from how the zip was created) — the build only looks at the
  archive root for a manifest or `index.html`
- fix: re-package so the manifest sits at the archive's top level, then redeploy; check the response's
  `detail`/`foundNestedAt` fields for exactly where one was found

### 422 app_nested_in_subdirectory
- match: `"code":"app_nested_in_subdirectory"` in the 422 response
- cause: the root `package.json` declares no dependencies of its own and delegates the build to a
  subdirectory (`"build": "npm --prefix frontend run build"`, `cd frontend && …`, or `workspaces`) —
  dependencies are only installed at the archive root, so the delegated build fails on a missing command
- fix: deploy the subdirectory itself; the response's `deployThisInstead` field names it. One deploy
  is one app — a frontend and a backend are two separate deploys

## Build failures (the build started and failed)

### "npm run build" did not complete successfully: exit code: 127
- match: `exit code: 127`, often with a trailing `docker-import … no such file or directory` line
- cause: exit 127 is "command not found" inside the build image — the binary the build script called
  isn't installed (missing from dependencies, or the real app is in a subdirectory whose dependencies
  were never installed). The `docker-import` line is cascade, not the cause
- fix: `GET .../logs` now returns **build** logs (`source: "build"`) when a build failed, and names the
  missing command directly

## Runtime crashes (build succeeded, app failed after)

### OOM killed
- match: `"OOM Killed"`, `Exit Code: 137`
- cause: app exceeds its allocated memory (256MB default). Common causes: an embedded DB the platform
  didn't auto-detect, or a dev-mode server (e.g. a "dev" CLI) shipped as the production start command
- fix: `PATCH .../memory {"memoryMb": 1024}`, then redeploy — or roll back to the current version to apply
  the new ceiling immediately with no rebuild

### Crash loop exhausted
- match: `"Not Restarting"`, `"Exceeded allowed attempts"`
- cause: symptom, not the root cause — the real reason is logged just above this line (usually an OOM kill
  or an uncaught startup exception)
- fix: `GET .../logs`, find the actual cause above this line, fix it, redeploy (resets the attempt counter)

### Pull access denied for a freshly built image
- match: `"pull access denied"`
- cause: platform-side bug — an image got referenced without a proper local version tag. Not caused by
  normal use of the deploy API.
- fix: not user-fixable; report the app name and timestamp

## Access & ownership

### 404 on status/logs endpoint
- match: `{"error":"Not found"}` from `GET .../status` or `.../logs`
- cause: a claimed app's status/logs require its owning company's token; an orphan app allows no token at
  all. A wrong or missing token on a claimed app always returns 404, never confirming the app exists.
- fix: send `Authorization: Bearer <deploy token>` for a claimed app; omit the header entirely if it's
  still meant to be an orphan

### Custom domain DNS not propagated
- match: `"DNS does not yet point at the platform"`
- cause: the custom domain's DNS record isn't set correctly yet, or hasn't propagated
- fix: confirm the CNAME/A record matches the `POST .../domains` response exactly, then retry
  `.../verify` after propagation — safe to retry repeatedly

## Async deploy flow (not actual failures)

### 202 Accepted misread as "live"
- match: `{"accepted":true}`, HTTP 202
- cause: not a failure — the deploy API responds immediately and the build continues in the background
- fix: poll `statusUrl` from the response until `deploy.status` is `"success"` or `"failed"`; never treat
  `202` itself as done

### 524 timeout (historical, should be rare now)
- match: `524`, `"A timeout occurred"`
- cause: previously caused by the deploy endpoint blocking on the full build before responding; fixed by
  the async 202 flow above. If seen now, the slow part is likely the upload itself, not the build.
- fix: check upload size/network first; report if it persists on a normal-sized upload

## Rollback

### Rollback target image unavailable
- match: `"is no longer available on this host"`
- cause: the target version's build image was cleaned from the host (very old version, or host rebuilt since)
- fix: roll back to a more recent version, or redeploy the old source fresh if you still have it
