# Embarko: Limitations & Recommendations

The real constraints of Embarko today, each with a recommendation for building around it.

| Limit | Recommendation |
|---|---|
| [Memory is fixed at 256MB; CPU is shared](#memory-is-hard-enforced-cpu-is-not) | Keep the footprint small; add timeouts around CPU work |
| [Disk has no quota](#disk-usage-isnt-quota-enforced-including-under-data_dir) | Cap logs, uploads and caches yourself |
| [Network isolation is unverified](#network-isolation-between-different-apps-containers-is-unverified) | Authenticate and encrypt internal traffic |
| [Only `DATA_DIR` survives a redeploy](#only-data_dir-survives-a-redeploy) | Store everything durable under `DATA_DIR` |
| [No backups](#persistent-data-is-not-backed-up) | Let the user export their data |
| [Only the last few images are kept](#only-the-last-n-build-images-are-kept-per-app) | Keep your own source history |
| [No background workers](#built-for-stateless-web-requestresponse-apps-not-background-workers) | Run heavy jobs elsewhere |
| [No custom Dockerfile](#the-build-system-auto-detects-theres-no-custom-dockerfile-support) | Use standard project layouts |
| [The platform sets CSP](#response-headers-including-content-security-policy-are-set-by-the-platform-not-your-app) | Don't rely on non-default CSP |
| [No region choice](#the-region-is-not-selectable-and-not-guaranteed) | Never promise a location |
| [Logs are a snapshot](#logs-are-a-recent-snapshot-not-a-live-stream) | Poll; ship important logs elsewhere |
| [Public endpoints are rate-limited](#public-unauthenticated-endpoints-are-rate-limited) | Back off, don't loop |
| [Apex domains skip your CDN](#an-apex-root-domain-loses-whatever-cdnproxy-youd-normally-put-in-front-of-it) | Prefer a subdomain |

Other pages: [`capabilities.md`](capabilities.md) lists what exists, [`api.md`](api.md) is the call-by-call contract, and [`troubleshoot.md`](troubleshoot.md) is the error reference. [`GET /capabilities`](https://ship.embarko.ai/capabilities) is machine-readable (a contents page; open the topic you need). If any of these disagree, it wins.

## [What are the compute and isolation limits?](#compute-isolation)

### [Memory is hard-enforced; CPU is not](#memory-is-hard-enforced-cpu-is-not)

Memory is reserved per app and enforced per container. An app that goes over is OOM-killed, not slowed down. A real incident confirmed this: the kernel killed one container and its neighbors were fine. CPU is a **relative share, not a ceiling**. A CPU-heavy neighbor can slow your app when the host is busy.

**Recommendation:**

- Build for the 256MB every app gets. Memory is the limit you can rely on.
- You can't raise it. There is no agent call for it and the dashboard control was removed. Your lever is the app's own footprint:
  - a production start command, not a dev server
  - no embedded database you don't use
- Don't build anything latency-sensitive that assumes steady CPU. Add timeouts and retries around CPU-bound work.

### [Disk usage isn't quota-enforced, including under `DATA_DIR`](#disk-usage-isnt-quota-enforced-including-under-data_dir)

Nothing stops an app from writing far more to disk than its fair share. A runaway app (endless logs, an uncapped cache, an upload endpoint with no size limit) can affect the shared host, not just itself.

**Recommendation:** cap anything that could grow without limit: rotate logs, limit upload size, evict cache entries. No quota does not mean free headroom. You are expected to police this yourself.

### [Network isolation between different apps' containers is unverified](#network-isolation-between-different-apps-containers-is-unverified)

Nobody has tested whether one app's container can reach another's directly, skipping the platform's routing layer.

**Recommendation:** don't treat network isolation as a security boundary for anything sensitive. Authenticate and encrypt traffic you would otherwise trust "because it's internal". Treat every request as if it could come from outside the platform.

## [What survives a redeploy?](#persistence)

### [Only `DATA_DIR` survives a redeploy](#only-data_dir-survives-a-redeploy)

Every redeploy builds a fresh image and starts a fresh container. The **only** folder kept across redeploys is the one `DATA_DIR` points at. Everything else resets to what the image contains. Code that expects a folder outside `DATA_DIR` and outside your uploaded source can crash at once with `ENOENT`, not just lose data later.

**Recommendation:**

- Put anything that must outlive a redeploy under `path.join(process.env.DATA_DIR, ...)`: a SQLite file, analytics counters, uploaded files, cached state.
- Create subfolders on startup with `{ recursive: true }`. Don't assume they exist.
- Don't treat any other path as durable, even for a short time.

### [Persistent data is not backed up](#persistent-data-is-not-backed-up)

Surviving a redeploy is the *only* durability promise for `DATA_DIR`. There is no snapshot, no backup and no restore. It is safe from your own deploys, but not from hardware loss, and not from your app corrupting or deleting its own data. Deleting the app destroys the data for good. Automatic backups are in progress but not available.

**Recommendation:**

- If losing the data would matter, have the app export it somewhere the user controls: a downloadable dump, an endpoint that streams the SQLite file, or a push to their own storage.
- Do this before the app holds anything valuable.
- Tell the user plainly. Someone who assumes a managed platform backs up their data will not ask.

## [How far back can I roll back?](#rollback)

### [Only the last N build images are kept per app](#only-the-last-n-build-images-are-kept-per-app)

Every deploy builds a real image, kept on the host and never pushed to a registry. Only the most recent few are kept. Older ones are removed automatically to limit disk use. Rollback, by API or from the dashboard, can only reach images still on disk. Going further back returns a `422` that says exactly how far back you can go (see [`troubleshoot.md`](troubleshoot.md#rollback-target-image-unavailable)). That is a normal response, not a platform failure.

**Recommendation:** treat rollback as "undo my last few deploys", not a long-term archive. To rebuild a much older version, keep your own source history (git tags, releases) and redeploy from it.

## [What can't I customize in the build or runtime?](#build-runtime-customization)

### [Built for stateless web request/response apps, not background workers](#built-for-stateless-web-requestresponse-apps-not-background-workers)

Every app runs as one long-lived process listening on `PORT`. There is:

- no separate worker or job feature
- no documented support for jobs that outlive a request
- no per-app control over concurrency or instance count

The default memory also assumes a web app, not a RAM-heavy processing job.

**Recommendation:** if the workload is really a background worker, don't fit it into an Embarko app today. That includes video or image processing, jobs that take minutes rather than seconds, and anything needing system binaries Railpack doesn't auto-install (ffmpeg, headless Chromium and so on). Run that part on infrastructure built for it, and have the Embarko app call it.

### [The build system auto-detects; there's no custom Dockerfile support](#the-build-system-auto-detects-theres-no-custom-dockerfile-support)

Apps are built with [Railpack](https://railpack.com), which detects the language and runtime from the source. You can't supply your own Dockerfile or a fully custom build pipeline. Most apps (Node, Python, static sites) need no setup. A build that doesn't fit a standard framework layout has no override for the build step.

**Recommendation:** use the project layout your language already expects (a `package.json` start script, a standard static site layout). Auto-detection is built around these. Railpack does allow some **runtime serving** overrides in your own repo, for example a custom `Caddyfile` for static sites (see [railpack.com](https://railpack.com)). These never replace the build step itself.

### [Response headers (including Content-Security-Policy) are set by the platform, not your app](#response-headers-including-content-security-policy-are-set-by-the-platform-not-your-app)

The platform sets a default `Content-Security-Policy` and a few other security headers at the edge for every app. These **override anything your app sets**. You can't set a different CSP per app today.

**Recommendation:** WebAssembly's `'wasm-unsafe-eval'` is already in the platform default. If you need a CSP directive the default lacks, there is no override today. Don't rely on non-default CSP behavior until there is a way to configure it.

## [Where do apps run?](#where-apps-run)

### [The region is not selectable, and not guaranteed](#the-region-is-not-selectable-and-not-guaranteed)

No API call has a region parameter and the dashboard has no region setting. An app's compute and its `DATA_DIR` volume always sit together. The platform chooses the region and doesn't commit to one. Choosing a region is a planned feature.

**Recommendation:**

- Never tell a user which country their app or data is in.
- Don't design around a particular region.
- If data residency matters (personal data under GDPR, or a sector rule about where records may be held), raise it with the user and point them at the [DPA](/dpa) before deploying. Don't assume.

## [What are the logging and rate limits?](#observability)

### [Logs are a recent snapshot, not a live stream](#logs-are-a-recent-snapshot-not-a-live-stream)

Checking logs returns the tail of the latest run's output at that moment. It doesn't stream, and how far back it goes is not guaranteed.

**Recommendation:** poll instead of expecting a live tail. If you need durable, long-lived logs (compliance, past debugging, anything you can't lose), ship them from the app to your own logging service. Don't use the platform as your log's system of record.

### [Public, unauthenticated endpoints are rate-limited](#public-unauthenticated-endpoints-are-rate-limited)

Two public endpoints are capped per email, per IP and globally:

| Endpoint | Per email | Per IP | Global |
|---|---|---|---|
| Request a deploy token by email: `POST /api/public/deploy-tokens/request` | 5/hour | 10/hour | capped, number not stated |
| Submit an anonymous customer query: `POST /api/public/customer-query` | 10 | 20 | 500/hour |

Both always return the same generic success response, whether or not the limit was hit and whether or not the email exists.

**Recommendation:** don't loop on a missing or unconfirmed email expecting a different answer. If you may have hit the limit, back off and retry later, not right away.

## [What should I know about custom domains?](#custom-domains)

### [An apex (root) domain loses whatever CDN/proxy you'd normally put in front of it](#an-apex-root-domain-loses-whatever-cdnproxy-youd-normally-put-in-front-of-it)

A subdomain (`app.yourdomain.com`) gets a CNAME to a dedicated platform hostname. An apex domain (`yourdomain.com`) can't use CNAME under standard DNS rules. It gets an A record pointing straight at the platform's origin, which skips any CDN or DDoS protection you would normally have in front.

**Recommendation:** prefer a subdomain over an apex domain if keeping your own CDN or proxy in front matters. Full details: [`troubleshoot.md`](troubleshoot.md#apex-root-domains-lose-your-cdnproxy-in-front-of-them).
