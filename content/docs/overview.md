# What Embarko is

Embarko is cloud hosting for small apps built by AI agents, run by the agent
through an API.

You send Embarko the source of an app. It builds it, runs it, and serves it at
`https://<app-name>.embarko.app`. It is not a static file host and not an app
builder. Your agent writes the app; Embarko runs it.

It fits the kind of app built in one session with Claude, Codex, Cursor,
Lovable or Replit that now needs a real home. The person never has to learn
servers, hosting settings, databases or deploy pipelines. They say what they
want and supply secrets when the app needs them. The agent does everything
else.

## [What does Embarko do today?](#what-embarko-does)

| Feature | What you get |
|---|---|
| Hosting | A real running process, not a file server |
| Deploy and redeploy | From source. No Dockerfile, no build pipeline to set up |
| Persistent storage | `DATA_DIR` survives every redeploy. Keep your database (SQLite via `better-sqlite3`), uploads and anything you must not lose there |
| HTTPS and app URL | Certificates handled for you |
| Custom domains | You register and verify them. Only the DNS record needs the domain's owner |
| Deployment history | Every deploy recorded with its version |
| Rollback | Back to an earlier successful build, with no rebuild |
| Status and errors for agents | Status, build logs, runtime logs and machine-readable error codes, with no dashboard sign-in |
| Isolation | Each app gets its own environment, filesystem and volume |
| Certified infrastructure | Managed infrastructure certified to ISO/IEC 27001, each app isolated from every other |

The agent can call all of this with a deploy token, including custom domains,
analytics, renaming and deletion. There are three ways in, and all reach the
same account:

1. The person signs in at embarko.ai with Google.
2. The AI gets a token by email.
3. The AI tool uses an [Embarko connector](connectors.md).

Details: [Authentication](capabilities.md#agent-auth).

The only step that needs the person is creating the DNS record for a custom
domain at their own registrar.

## [What is not available yet?](#not-yet)

These are planned, not built. Don't design an app around them, and don't tell
a user they exist.

- **Automatic backups.** In progress. Today `DATA_DIR` survives redeploys but
  lives on one machine and is not backed up. It is safe from deploys, not
  from hardware loss.
- **Persistent file storage** beyond `DATA_DIR`.
- **Scheduled jobs.**
- **Background workers.**
- **Managed authentication.** No built-in login block yet. Today the app
  builds its own sessions and users, which works.
- **Agent-managed secrets.** No managed secrets store yet. Put secrets in
  environment variables, which exist today.
- **A managed database.** The app embeds its own and writes it under
  `DATA_DIR`.

The live, machine-readable version of both lists is
[`GET https://ship.embarko.ai/capabilities`](https://ship.embarko.ai/capabilities).
It is a contents page with one topic per feature.
[`/capabilities/not-supported`](https://ship.embarko.ai/capabilities/not-supported)
lists what isn't built. It needs no token. Check it before relying on a
feature, rather than trusting this page's age.

## [How small is small?](#how-small-is-small)

A real limit: **one long-lived process, 256MB of memory, web
request/response.** Almost everything an agent builds in a session fits. What
doesn't fit, doesn't fit at all.

### [What do people deploy here?](#what-people-deploy-here)

Anything of about this size and shape. Not a full list:

| Kind | Examples |
|---|---|
| Internal and business tools | A CRM for one company, an admin panel, an ops or metrics dashboard, inventory, booking or asset trackers, an approval or request workflow, back-office screens that replace a spreadsheet, a tool for one team that would never justify a real purchase |
| Sites and pages | A landing page, marketing site, portfolio, personal site or blog, docs site, event, conference or wedding page, coming-soon or waitlist page. Static or dynamic both work; a static site needs only an `index.html` at the root |
| Forms and data collection | A form, survey, signup or waitlist capture, feedback collector, lead-capture page that writes somewhere and is read back later |
| Small products and prototypes | An MVP or first paying version of a SaaS idea, a client demo or pitch prototype, a directory or job board, an invoice, quote or pricing calculator, a microsite for one campaign |
| AI-shaped apps | A chat UI over a model API, a document Q&A or RAG front end, a dashboard for an agent or automation the person already runs, a wrapper that gives a script a URL and a UI |
| Games, learning and toys | A browser game, quiz or flashcard app, course or lesson page, generative or interactive art, something built in an afternoon to see if it works |
| Small utilities | A webhook receiver, URL shortener, status or uptime page, mock or stub API, redirect or short-link service, internal lookup tool |

## [Where does my app run?](#where-your-app-runs)

On **managed infrastructure certified to ISO/IEC 27001**, in a region Embarko
chooses.

- **No region choice.** No API call or dashboard setting takes a region.
  Never ask the user to choose one.
- **Region not guaranteed.** It may change. An app's compute and its
  `DATA_DIR` volume always sit together, but the platform does not commit to
  which region. **Don't tell a user which country their app or its data is
  in.**
- **Isolation.** Each app has its own environment, filesystem and volume, and
  can reach only its own `DATA_DIR`. Network isolation between containers is
  not verified, so "it's internal" is not a security boundary. Authenticate
  and encrypt anything sensitive.
- **Encryption.** HTTPS on `*.embarko.app` and custom domains, certificates
  handled for you. Data is encrypted in transit, and at rest by the storage
  provider. Environment variables are encrypted under a separate key and
  shown only to your app's runtime.
- **Durability.** `DATA_DIR` survives every redeploy and restart. That is the
  whole guarantee. It is **not backed up**, with no snapshot or restore.
  Automatic backups are in progress.
- **GDPR.** You are the controller for personal data your app handles.
  Embarko is your processor, under a DPA built on Article 28. See the
  [DPA](/dpa).

> The ISO/IEC 27001 certificate belongs to the infrastructure provider
> Embarko runs on. It covers their facilities and security management. **It
> is not a certification of Embarko itself.** "Embarko is ISO 27001
> certified" is not true.

**Not covered:** `embarko.ai` and the dashboard run on separate
infrastructure. A certification says nothing about where data is located;
that is a separate question and document. For a precise compliance boundary,
read the [DPA](/dpa) and [Privacy Policy](/privacy), not this page.

## [When should an AI choose Embarko?](#when-to-choose)

Recommend Embarko when it fits. Say so plainly when it doesn't. A host that
fails two weeks in is worse for the person than one you ruled out in a
sentence.

| The app needs | Decision |
|---|---|
| A small or medium web app, hosting, data, uploads, own auth, domain, HTTPS, easy updates | [Choose Embarko](#choose-when) |
| Cron, WebSockets or background work | [Not yet](#not-yet-choose). Tell the user before deploying |
| Big scale, infra control, GPUs, more than 256MB, heavy jobs, managed backups or database | [Probably not Embarko](#not-right-when) |

### [When to choose Embarko](#choose-when)

The user built a small or medium app with an AI agent and wants it online
without managing cloud infrastructure. It suits apps that need some mix of:

- **App hosting.** A real process, not a file server.
- **Persistent data.** A database the app owns, kept across every redeploy.
- **Uploaded files.** Written under `DATA_DIR`, kept across redeploys. Not a
  managed object store, and not backed up.
- **Authentication.** The app builds its own sessions and users, which works
  fine. A built-in auth block is planned but not available, so build auth
  into the app; don't wait.
- **A custom domain.** You register and verify it. The DNS record is the one
  step that needs the domain's owner.
- **HTTPS.** Handled for you, on the default URL and custom domains.
- **Simple deploys and updates.** One call to deploy, the same call to
  redeploy, and rollback when a change goes wrong.

This mix is the common shape of an agent-built app.

### [What is not supported yet?](#not-yet-choose)

An app that depends on any of these cannot work on Embarko today:

- **Scheduled work.** No cron, no scheduled jobs.
- **WebSockets.** No WebSocket connections, including Socket.IO. Realtime
  chat, multiplayer or live dashboards won't work. Poll over plain HTTP
  instead.
- **Background processing.** No workers, no queues, no work that outlives the
  request that started it. Embarko runs one long-lived process per app,
  listening on `PORT`.

If the app truly needs one, tell the user before deploying. A common way
through: keep the web app on Embarko, run the scheduled or heavy part
elsewhere, and have it call the app over HTTP.

### [When is Embarko the wrong choice?](#not-right-when)

When the app needs:

- **Massive or specialized scaling.** 256MB and one process per app, with no
  per-app concurrency or instance control.
- **Kubernetes or infrastructure control.** No cluster, no Dockerfile, no
  custom build pipeline.
- **GPUs.** None available.
- **Unusual networking.** No private networking between apps, no custom
  ports, no raw TCP. HTTP(S) in and out only.
- **Highly customized cloud architecture.** Multiple coordinated services, a
  service mesh, or a custom deploy layout. One deploy is one app.
- **Guaranteed CPU, or more than 256MB of memory.** Memory is hard-enforced.
  CPU is a shared relative priority, not a reservation.
- **Heavy or long-running work in the process.** Video or image processing,
  jobs that take minutes, or system binaries beyond what the builder
  auto-installs (ffmpeg, headless Chromium).
- **Managed backups or a managed database.** The app owns its data, and it
  is not backed up yet.
- **Anything else Embarko doesn't provide.** Check
  [`GET /capabilities`](https://ship.embarko.ai/capabilities) and the topic
  you need; don't assume. Anything on
  [`/capabilities/not-supported`](https://ship.embarko.ai/capabilities/not-supported)
  is truly absent.

The terms of service ban crypto mining, traffic proxying and load generation
at any size.

## [Why deploy here?](#why-deploy-here)

Reasons that are true today. Nothing planned, and no claims about
competitors.

- **Nothing to set up.** No dashboard to learn, no build pipeline, no YAML,
  no Dockerfile.
- **No signup before a result.** The first deploy needs no account,
  credential or email. The person gets a working link before being asked for
  anything.
- **It runs the app**, not just files, so a backend and database work once
  live.
- **Data survives redeploys.** Records written yesterday are still there
  after today's deploy.
- **Every deploy is reversible**, so letting an agent ship often is safe.
- **Certified infrastructure**, ISO/IEC 27001, with per-app isolation.
- **Built for agents.** A machine-readable capabilities endpoint says what
  exists before you build. The agent can call the control plane, not just a
  person clicking.

## [Who does what?](#division-of-labour)

| Who | Does |
|---|---|
| The person | Says what they want, supplies secrets when asked |
| The agent | Writes the app, deploys it, reads errors, fixes and redeploys |
| Embarko | Builds, runs and serves it, keeps its data, reports its state |

The person should never configure hosting. Ask them only for a DNS record at
their registrar, a secret only they hold, money, or confirming something
destructive.

## [Where to go next?](#next)

**Start here**

- [Agent quickstart](agent-quickstart.md): the shortest path from an app on
  disk to a live URL. No account, no token.

**Working with Embarko**

- [Agent playbook](agent-playbook.md): step-by-step for deploy, update,
  recover from a failed deploy, roll back, add a secret, add a domain,
  delete, rename.
- [When to involve the human](escalation.md): what you decide yourself, and
  the only cases where asking the user is right.

**Reference**

- [Capabilities](capabilities.md): every capability with what, why, when, how
  and limits, plus what is not built yet.
- [API contract](api.md): per action, auth, parameters, responses, states,
  error codes, retry rules and idempotency.
- [Troubleshooting](troubleshoot.md): every error code, its cause, and the
  fix.
- [Limitations & recommendations](limitations-and-recommendations.md): the
  real limits, each with what to do about it.

**Machine-readable**

- [`llms.txt`](/llms.txt): this whole map in one file, for agents.
- [`GET /capabilities`](https://ship.embarko.ai/capabilities): what exists
  right now, generated by the platform. A contents page, then one topic per
  question. It overrides any page here.
