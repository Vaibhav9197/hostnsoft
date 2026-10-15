---
title: "Deploy a Replit App for Free: Export and Host It"
meta_description: "Deploy a Replit app for free: download it as a zip, paste Embarko's deployment prompt into your agent and get a live HTTPS link. No GitHub or Dockerfile needed."
slug: "deploy-replit-app-free"
primary_keyword: "deploy replit app for free"
secondary_keywords: ["how to deploy replit app", "host replit app", "deploy replit app outside replit", "export replit app", "replit app hosting free"]
category: "Guide"
cover: "/assets/guides/deploy-replit-app-free.png"
cover_alt: "A Replit project is downloaded as a zip, unzipped into my-app, and deployed by an AI agent to a live link at your-app-name.embarko.app."
read_minutes: 12
datePublished: "2026-10-12"
dateModified: "2026-10-14"
last_verified: "2026-10-14"
author: "The Embarko team"
status: "published"
---

# How to deploy a Replit app for free

**To deploy a Replit app for free, download it from Replit as a zip, open the folder in an AI agent that can run commands, and paste Embarko's deployment prompt.** The agent uploads the project and hands you a live HTTPS link at `your-app-name.embarko.app`. Embarko's Free plan lists [unlimited static websites and 1 dynamic app](/pricing), and you press **Keep** within 24 hours so the link stays. [Check that your app fits](#fit) first.

## [Key takeaways](#takeaways)

- A Replit app runs and lives inside Replit. To host it elsewhere you export it first. Replit's help page says to select the three-dot menu at the top of the file tree and choose **Download as zip**.
- The usual route to a new host asks for a GitHub repository, a hosting account, build settings and secret keys.
- With Embarko, your AI agent packs the unzipped folder and [uploads it](/docs/deploy) from one prompt. No GitHub repo is needed.
- A zip holds files only. Replit's own docs say secret values never leave the old project, the database isn't copied and App Storage buckets don't move, so all three have to be moved by hand. [Here is how](#data).
- The Free plan is $0, with Embarko branding. Your own domain is listed under Creator, not Free. Prices are from [embarko.ai/pricing](/pricing) and can change.

## [Why a Replit app is hard to move](#why)

On Replit, building and hosting happen in one place. Replit runs your app, stores its files, keeps its database and holds its secrets. That's why it's so quick to start, and also why leaving takes a few deliberate steps.

Hosting your app somewhere else is called **deploying**. It takes three things: a server that stays on, your app's files copied onto it, and a public address anyone can open. Together that's called **hosting**. Before any of that, your files have to leave Replit, which means exporting them.

## [Why deploying a Replit export gets complicated](#hard)

Once you have the files, the usual route to a new host asks for more than you may expect:

1. **A GitHub account and a repository**, plus enough Git to push the export.
2. **A hosting service.** Vercel, Netlify and others each have their own sign-up, dashboard and vocabulary.
3. **Build and start settings**, and sometimes a Dockerfile Replit didn't write.
4. **Secret keys added again.** Values you saved in Replit's Secrets tool don't travel with the zip.
5. **Data that stays behind.** A database you set up inside Replit and files in Replit's App Storage are services, not files in the project.

That's fair work for a developer. For a small app you built in Replit in one sitting, it's a lot between "it works there" and "here's the link".

## [The usual route compared with Embarko](#compare)

Embarko is hosting that your AI tool runs for you. Your agent packs the exported folder, uploads it and checks that it's live.

| The usual route | With Embarko |
|---|---|
| Push the export to a GitHub repository | No repository. Your agent [uploads the folder directly](/docs/deploy). |
| Sign up for a host and connect it | Your first link needs no account. |
| Configure the build, maybe add a Dockerfile | No Dockerfile. Embarko [detects the language](/docs/deploy) and builds the app itself. |
| Read the build logs yourself | The agent checks the status and hands you the link. |

## [Will your Replit app fit on Embarko?](#fit)

Embarko hosts small request-and-response apps: one process, [256MB of memory](/docs/deploy) and no GPU. Check your app against this table before you export.

| Your Replit app | Fits? | What to know |
|---|---|---|
| Static site (HTML, CSS, JavaScript) | Yes | Published as files, usually live in the first reply. No logs and no [environment variables](/docs/static-sites). |
| Small Node.js app, such as Express | Yes | `package.json` at the top of the folder. Read the port from `PORT` and listen on `0.0.0.0`. |
| Small Python app, such as Flask or FastAPI | Yes | `requirements.txt` or `pyproject.toml` at the top of the folder. |
| React or Vite app with a build step | Yes, as a server app | Built first, then run as a [server app](/docs/static-sites). On the Free plan, this is your one dynamic app. |
| App that stores data in a database set up inside Replit | Another route | Embarko has [no managed database](/docs/data). A SQLite file under `DATA_DIR` is the built-in option. [Export the data](#data) before you download the zip, then delete the dump from the project. |
| Uses Replit Auth or App Storage | Swap them | App Storage buckets don't move with a project, and Replit Auth is Replit's own sign-in. Embarko has no built-in login or object store, so ask your agent to build the app's own sign-in and to keep uploaded files under `DATA_DIR` (download them from App Storage first). |
| Live updates ([WebSockets](/docs/prerequisites)) | Another route | Use regular HTTP polling instead. |
| [Scheduled jobs](/docs/prerequisites) or [background workers](/docs/prerequisites) | Another route | Run them elsewhere and have them call your app. |
| Heavy processing or more than 256MB | Another route | Run that part elsewhere. Going over 256MB is an [out-of-memory kill](/docs/deploy), and the limit [can't be raised](/docs/deploy). |

**Delete any Dockerfile** in the export. Embarko builds the app itself and [rejects an upload that includes one](/docs/deploy).

## [How to deploy a Replit app to Embarko, step by step](#steps)

**Before you start:** you have a Replit project to export, and an AI agent that can run commands in a folder on your computer, such as Claude Code or Cursor.

### [1. Download the project from Replit](#step-1)

In your Replit project, select the three-dot menu at the top of the file tree and choose **Download as zip**. If the download fails, open a Shell in Replit, run `zip -r project.zip .`, and download `project.zip` from the file tree (Replit's own fallback).

**What success looks like:** a `.zip` on your computer. Unzip it and open the folder that holds your manifest (`package.json`, `requirements.txt`, `pyproject.toml` or `index.html`).

> Menu names are from [Replit's help page](https://docs.replit.com/help/projects-and-files) as of October 2026. Check that page if your workspace looks different.

### [2. Open the folder in an AI agent](#step-2)

Use any agent that can run terminal commands in your project folder. Embarko's pages name Claude Code and Cursor, and say that if an AI tool built your app, Embarko can host it. Only Claude has an [Embarko connector](/docs/connectors), and the connector deploys from a public `.tar.gz` link, so it can't upload a folder from your laptop. For a Replit export, use the deployment prompt.

### [3. Paste the deployment prompt](#step-3)

Open [embarko.ai](/) and click **Host your app**. It copies the deployment prompt. Paste it into the agent, then add one line:

```text
I exported this from Replit, help me get it live on Embarko
```

The agent may ask how you want to sign in. Pick **token by email** (give your email, then paste the token from your inbox) or create a token at [embarko.ai/app/tokens](/app/tokens) and paste it. Skip the connector option, even in Claude, because it deploys from a public link, not from a folder on your computer. With a token the app goes into your account from the start. If you skip, the app still works for 24 hours. [Authentication: three ways in](/docs/claim) explains each option.

### [4. Let the agent upload it](#step-4)

The agent packs the folder as a `.tar.gz`, leaving out `node_modules`, `.git` and `.env` files. It then uploads the archive and checks the status about every 10 seconds until it reads `live`. A static site is usually live in the first reply, and a server app builds first.

The app name becomes your address: lowercase letters, numbers and dashes, 3 to 63 characters, unique across all of Embarko. If it's taken, the agent picks another.

- A first reply of "202 Accepted" only means the build has started. See [202 Accepted is not live](/docs/status).
- If the upload fails with a network error or `403 host_not_allowed`, your agent's sandbox is blocking Embarko and nothing was deployed. See [if something goes wrong](#errors).

### [5. Open your link and keep it](#step-5)

When the status is `live`, the agent gives you `your-app-name.embarko.app`. Open it and click around. If you used a token in step 3, the app is already in your account. Otherwise a link made without a token lasts 24 hours, so open the claim link your agent gave you and press **Keep**, or ask the agent to [make it permanent with a token](/docs/claim). The address doesn't change. From then on your agent needs your deploy token to redeploy, and the page you land on after pressing **Keep** gives you a prompt that carries it. Paste that into your agent once.

## [Move your data and secrets by hand](#data)

If your Replit app kept data in Replit's database, that data isn't in the zip. Export it before you leave:

1. In Replit's Shell, follow [Replit's guide](https://docs.replit.com/teams/identity-and-access-management/manually-copy-projects). It runs `pg_dump` against `$DATABASE_URL`, which exports the development database.
2. Your published app's live data is usually in the production database. Copy its connection string from the Database tool's settings and put it in the command in place of `$DATABASE_URL`.
3. The command writes a file called `backup.dump`. Download it, then delete it from the Replit file tree before you download the project zip ([step 1](#step-1)).
4. Keep the dump outside the folder you upload (anything in the archive ships with the app) and give it to your agent to read and convert.

Also move these by hand:

- **Load the data.** Ask your agent how to load the exported rows into a SQLite file under `DATA_DIR`. That folder exists only on the running app, so the agent needs a one-time import that runs inside the app, and any data file it ships in the upload holds real user data too. `DATA_DIR` survives redeploys, so keep your own copy of important data. Large or busy databases are a sign the app should stay where its database lives.
- **Secrets.** Once you've pressed **Keep**, add each API key as an [environment variable](/docs/env-vars): write the value, then apply it. A write alone [doesn't reach the running app](/docs/env-vars). Static sites can't have environment variables.
- **Logins and uploaded files.** Replit's docs say App Storage buckets don't move with a project, and Replit Auth is Replit's own sign-in. If your app uses either, ask your agent to build the app's own sign-in and to store uploads under `DATA_DIR`.

Since Embarko isn't where your code lives, [keep your own copy](/docs/rollback) too. Keep the zip, or put the folder in a local Git repository.

## [If something goes wrong](#errors)

Failed deploys often come down to a blocked upload, a missing key or setting, or an app listening on the wrong port. Here's what you might see:

| What you see | Likely cause | Fix |
|---|---|---|
| A network error, or [`403 host_not_allowed`](/docs/connectors) | The agent's sandbox blocks Embarko. Nothing was deployed. | Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app` in the agent's network settings, or ask for the commands and run them in your own terminal. On Windows, ask for PowerShell versions that call `curl.exe` and `tar.exe`. |
| [`422 no_manifest_at_root`](/docs/errors) | The manifest is in a subfolder of the zip | Repackage so `package.json` or `requirements.txt` is at the top of the archive. |
| [Exit code 137](/docs/deploy) | The app went over 256MB, often because it runs a dev server | Use the production start command, not `vite dev`. |
| [`409 app_name_taken`](/docs/errors) | Someone else already uses that name | Pick a different name. Don't retry it. |
| The app loads but its data is empty | Replit data didn't come with the zip | Export it from Replit (see [move your data](#data)) and load it into SQLite under `DATA_DIR`. |
| [App gone after a day](/docs/claim) | It was never kept | Deploy it again with a token, or press **Keep** this time. |
| The link doesn't open, or the status says failed or crashed | The app is listening on the wrong port or only on localhost | Ask your agent: "Make my app read its port from the PORT environment variable and listen on 0.0.0.0, then redeploy." |

Other codes are in the [troubleshooting reference](/docs/errors).

## [FAQ](#faq)

### [What does it mean to deploy a Replit app outside Replit?](#faq-meaning)

It means taking your app's files out of Replit and putting them on a host of your own choosing, so it gets a public address that no longer depends on Replit. You export the project as a zip, and a host runs it. Data, secrets and logins that lived inside Replit have to be moved too.

### [Can I deploy a Replit app for free?](#faq-free)

Yes, if it fits. Download the project as a zip from Replit, open the folder in an AI agent and paste Embarko's deployment prompt. Embarko's Free plan lists unlimited static websites and 1 dynamic app for $0 a month, with Embarko branding. Plans can change, so check [embarko.ai/pricing](/pricing).

### [Do I need GitHub to move a Replit app?](#faq-github)

No. Embarko takes the project folder directly: your agent packs it and uploads it, so there's no repo to create or connect and no Dockerfile to write. Embarko isn't where your code lives, so [keep your own copy](/docs/rollback), such as the zip or a local Git repository, so you can redeploy an older version later.

### [Will my Replit database and secrets move over?](#faq-data)

Not by themselves. A zip holds your files. Export a Replit database with `pg_dump` and load it into SQLite under `DATA_DIR`, and re-enter the values from Replit's Secrets tool as [environment variables](/docs/env-vars) once you've pressed **Keep**. Embarko has [no managed database](/docs/data), so an app that needs Postgres or MySQL stays where its database lives.

### [Does Embarko have a Replit integration?](#faq-integration)

Embarko's docs describe no Replit-specific integration. Only Claude has an [Embarko connector](/docs/connectors), and it deploys from a public `.tar.gz` link, not from a folder on your computer. For a Replit export, use the deployment prompt in an agent that can run commands, or deploy with a token by email.

### [Will the app stay online?](#faq-stay-online)

Once you press **Keep**, yes. An app deployed without a token is deleted 24 hours after its first deploy, with no reminder email. Open the claim link in your agent's deploy message and sign in, and it stays at the same address. No link? Ask your agent to [make it permanent with a token](/docs/claim). Apps deployed with a token are already in your account.

### [Is it safe to host my Replit app on Embarko?](#faq-safe)

Keep secret keys out of the folder you upload. The agent leaves `.env` files out of the archive, and Embarko stores environment variables encrypted so nobody can read them back. Also remember that anyone with your link can open the app, so if it uses your AI key, set a spending limit with your AI provider if they offer one.

## [Built something with AI? Ask it to deploy to Embarko.](#deploy)

Export from Replit, paste the prompt into your agent and get a live link without creating a repo. [Get the deployment prompt →](/)

**Keep reading:** [How to deploy an AI app](/guides/how-to-deploy-ai-app) · [Deploy an app without GitHub](/guides/deploy-app-without-github) · [Deploy from Cursor](/guides/deploy-from-cursor) · [Agent quickstart](/docs/quickstart) · [Troubleshooting reference](/docs/errors) · [Replit help: projects and files](https://docs.replit.com/help/projects-and-files) · [Pricing](/pricing)
