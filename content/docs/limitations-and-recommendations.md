# Embarko: Limitations & Recommendations

These are real, confirmed constraints of the platform as it exists today —
not hypotheticals, not "might happen someday." Each one pairs what's
actually true with a concrete recommendation for building a robust app
around it. [`capabilities.md`](capabilities.md) lists what exists,
[`api.md`](api.md) is the call-by-call contract and
[`troubleshoot.md`](troubleshoot.md) is the error reference; this one is
about designing for the platform's real shape rather than an idealized one.
[`GET /capabilities`](https://ship.embarko.ai/capabilities) is
machine-readable and wins over any of them if they disagree.

## Compute & isolation

### Memory is hard-enforced; CPU is not
Memory is reserved per app and enforced at the container level — exceeding
your limit gets your app OOM-killed, not throttled (confirmed via a real
incident where the kernel killed one container without affecting its
neighbors). CPU, by contrast, is a **relative share, not a ceiling** — a
CPU-heavy neighbor app can degrade your app's performance under contention.

**Recommendation:** build for the 256MB every app gets, and treat memory as
the limit you can actually rely on. Raising it is not self-serve today — there
is no agent-facing call for it and the dashboard's control has been removed —
so the lever you have is the app's own footprint: a production start command
rather than a dev server, and no embedded database you aren't using. Don't
build anything latency-sensitive that assumes guaranteed CPU throughput either
— add timeouts and retries around CPU-bound work rather than assuming
consistent performance.

### Disk usage isn't quota-enforced, including under `DATA_DIR`
Nothing currently stops an app from writing far more to disk than its own
reasonable share. A runaway app (unbounded logs, an uncapped cache, an
upload endpoint with no size limit) can affect the shared host, not just
itself.

**Recommendation:** cap anything your app writes that could grow
unboundedly — log rotation, upload size limits, cache eviction. Don't treat
absence of an enforced quota as permission to skip these; it's an operating
constraint you're expected to self-police, not a guarantee of headroom.

### Network isolation between different apps' containers is unverified
Whether one app's container can reach another app's directly, bypassing the
platform's own routing layer entirely, has not been tested either way.

**Recommendation:** don't rely on network isolation as a security boundary
for anything sensitive. Authenticate and encrypt any traffic you'd
otherwise trust "because it's internal" — treat every request your app
receives as if it could have come from outside the platform, because that
assumption can't currently be verified.

## Persistence

### Only `DATA_DIR` survives a redeploy
Every redeploy builds a fresh image and schedules a fresh container. The
**only** directory guaranteed to survive across redeploys is whatever
`DATA_DIR` points at — everything else resets to exactly what your image
contains, every time. Code that assumes an ad-hoc folder exists outside
`DATA_DIR` and outside your uploaded source can crash immediately at
runtime (`ENOENT`), not just lose data later.

**Recommendation:** put anything that needs to outlive a redeploy — a
SQLite file, analytics counters, uploaded files, cached state — under
`path.join(process.env.DATA_DIR, ...)`, and create subdirectories with
`{ recursive: true }` on startup rather than assuming they already exist.
Don't design around any other path being durable, even temporarily.

### Persistent data is not backed up
`DATA_DIR` surviving a redeploy is the *only* durability guarantee. There
is no snapshot, no backup and no restore — so it is durable against your own
deploys, not against hardware loss, and not against your app corrupting or
deleting its own data. Deleting the app destroys it outright, irreversibly.
Automatic backups are in progress but not available.

**Recommendation:** if losing the data would matter, have the app export it
somewhere the user controls — a downloadable dump, an endpoint that streams
the SQLite file, or a push to their own storage. Do this before the app
holds anything valuable, not after. And say so plainly: a user who assumes
a managed platform backs their data up will not ask.

## Rollback

### Only the last N build images are kept per app
Every deploy builds a real image, kept locally (never pushed to a
registry). Only the most recent handful are retained — older ones are
pruned automatically to bound disk usage. Rollback — by API or from the
dashboard — can only reach as far back as whatever's still on disk; trying
to roll back past that gets a `422` naming exactly how far back you can
currently go (see
[`troubleshoot.md`](troubleshoot.md#rollback-target-image-unavailable)) —
it's a normal, expected response, not a platform failure.

**Recommendation:** don't rely on being able to roll back to an
arbitrary point in the past — treat rollback as a short-term "undo my
last few deploys" tool, not a long-term version archive. If you need to
reproduce a much older version, keep your own source history (git tags,
releases) and redeploy fresh from it instead of rolling back to it.

## Build & runtime customization

### Built for stateless web request/response apps, not background workers
Every app runs as a single long-lived process listening on `PORT` — there's
no separate worker/job primitive, no documented support for jobs that run
past a request's lifetime, and no per-app control over concurrency or
instance count. The default memory footprint assumes the same thing: a web
app, not a RAM-heavy processing job.

**Recommendation:** if your workload is really a background worker — video
or image processing, jobs measured in minutes rather than seconds, or
anything needing system binaries beyond what Railpack auto-installs (ffmpeg,
headless Chromium, etc.) — don't try to fit it into an Embarko app today.
Run that piece on infrastructure built for it and have your Embarko-hosted
app call out to it, rather than doing the work in-process.

### The build system auto-detects; there's no custom Dockerfile support
Apps are built with [Railpack](https://railpack.com), which auto-detects
your language/runtime from source — there's no way to supply your own
Dockerfile or fully custom build pipeline. For most apps (Node, Python,
static sites) this needs zero configuration. For a build that genuinely
doesn't fit a standard framework layout, there's currently no override for
the build step itself.

**Recommendation:** stick to conventional project layouts your language's
ecosystem already expects (a `package.json` start script, a standard
static-site layout, etc.) — that's what auto-detection is built around.
Railpack does support some **runtime serving** overrides in your own repo
(e.g. a custom `Caddyfile` for static sites — see
[railpack.com](https://railpack.com)); it doesn't extend to replacing the
build step itself.

### Response headers (including Content-Security-Policy) are set by the platform, not your app
The platform applies a default `Content-Security-Policy` (and a few other
security headers) at the edge for every app, which **takes precedence over
anything your own app sets**. There's currently no supported way to
configure a different CSP per app.

**Recommendation:** if your app needs `'wasm-unsafe-eval'` (WebAssembly)
this is already covered by the platform default. If you need a CSP
directive the platform default doesn't include, there's no override today
— avoid relying on non-default CSP behavior until a configuration path
exists for it.

## Where apps run

### The region is not selectable, and not guaranteed
There is no region parameter on any API call and no dashboard setting. An
app's compute and its `DATA_DIR` volume always sit together, but which
region that is, is chosen by the platform and is not committed to. Choosing
one is a planned feature.

**Recommendation:** never tell a user which country their app or its data is
in, and don't design around a particular one. If data residency matters for
what is being deployed — personal data under GDPR, or a sector rule about
where records may be held — raise it with the user and point them at the
[DPA](/dpa) before deploying, rather than assuming.

## Observability

### Logs are a recent snapshot, not a live stream
Checking logs returns the tail of the most recent run's output at the
moment you call it — it does not stream, and there's no guarantee on how
far back it retains.

**Recommendation:** poll rather than expect a live tail. If you need
durable, long-retention logs (for compliance, historical debugging, or
anything you can't afford to lose), ship them to your own external logging
service from within your app — don't rely on the platform as your log's
system of record.

### Public, unauthenticated endpoints are rate-limited
Requesting a deploy token by email
(`POST /api/public/deploy-tokens/request`) and submitting a customer query
anonymously (`POST /api/public/customer-query`)
are both capped per-email, per-IP, and globally: 5/hour per email and
10/hour per IP for token requests; 10/email, 20/IP, and 500/hour globally
for customer queries. Both always return the same generic success response
regardless of whether the limit was hit or the target email even exists.

**Recommendation:** don't loop on a missing/unconfirmed email expecting a
different response if you hit the limit — back off and retry later instead
of retrying immediately.

## Custom domains

### An apex (root) domain loses whatever CDN/proxy you'd normally put in front of it
A subdomain custom domain (`app.yourdomain.com`) gets a CNAME to a
dedicated platform hostname; an apex domain (`yourdomain.com`) can't use
CNAME under standard DNS rules, so it gets an A record pointing directly at
the platform's origin instead — bypassing any CDN/DDoS protection you'd
normally have in front of it.

**Recommendation:** prefer a subdomain over an apex domain if keeping your
own CDN/proxy in front of traffic matters to you. See
[`troubleshoot.md`](troubleshoot.md#apex-root-domains-lose-your-cdnproxy-in-front-of-them)
for the full mechanics.
