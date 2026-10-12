---
title: "Deploy a Replit App for Free: Export and Host It"
meta_description: "Deploy a Replit app for free: download it as a zip, paste Embarko's deployment prompt into your agent and get a live HTTPS link. No GitHub or Dockerfile needed."
slug: "deploy-replit-app-free"
primary_keyword: "deploy replit app for free"
secondary_keywords: ["how to deploy replit app", "host replit app", "deploy replit app outside replit", "export replit app", "replit app hosting free"]
category: "Guide"
cover: "/assets/guides/deploy-replit-app-free.png"
cover_alt: "A Replit project is downloaded as a zip, unzipped into my-app, and deployed by an AI agent to a live link at your-app-name.embarko.app."
read_minutes: 8
datePublished: "2026-10-12"
dateModified: "2026-10-12"
last_verified: "2026-10-12"
author: "The Embarko team"
status: "published"
---

# How to deploy a Replit app for free

**To deploy a Replit app for free, download it from Replit as a zip, open the folder in an AI agent that can run commands, and paste Embarko's deployment prompt.** The agent uploads the project and hands you a live HTTPS link at `your-app-name.embarko.app`. Embarko's Free plan lists [unlimited static websites and one dynamic app](/pricing). It does not fit apps that need a Postgres or MySQL database, WebSockets or background jobs, so [check the fit first](#fit).

## [Key takeaways](#takeaways)

- **Export first.** Replit's help page says to select the three-dot menu at the top of the file tree and choose **Download as zip**. No GitHub repo is needed.
- **Your agent does the deploy.** Open the unzipped folder in an AI agent that can run terminal commands, such as Claude Code or Cursor, paste the deployment prompt from [embarko.ai](/), and it packs and uploads the project.
- **The Free plan is $0.** It lists unlimited static websites and 1 dynamic app, with Embarko branding. Your own domain is listed under Creator, not Free. Prices are from [embarko.ai/pricing](/pricing) and can change.
- **Data and secrets do not come with the zip.** A zip holds files. Values you saved in Replit's Secrets tool, and data in any database you set up inside Replit, have to be recreated.
- **Claim the app within 24 hours.** An app deployed without a token is [deleted after 24 hours](/docs/troubleshoot#your-app-disappears-24-hours-after-an-anonymous-deploy).

## [Will your Replit app fit on Embarko?](#fit)

Embarko hosts small request-and-response apps: one process, [256MB of memory](/docs/capabilities#resources) and no GPU. Check your app against this table before you export.

| Your Replit app | Fits? | What to know |
|---|---|---|
| Static site (HTML, CSS, JavaScript) | Yes | Published as files, usually live in the first reply. No logs and no [environment variables](/docs/capabilities#static-sites). |
| Small Node.js app, such as Express | Yes | `package.json` must sit at the top of the folder. |
| Small Python app, such as Flask or FastAPI | Yes | `requirements.txt` or `pyproject.toml` must sit at the top of the folder. |
| React or Vite app with a build step | Yes, as a server app | It is built, then run as a [server app](/docs/capabilities#static-sites), not published as plain files. |
| App that stores data in a database set up inside Replit | Not as it is | Embarko has [no managed database](/docs/capabilities#database), so no Postgres or MySQL. A SQLite file under `DATA_DIR` is the built-in option. |
| WebSockets or realtime push | No | [Not supported](/docs/capabilities#http-endpoints). Use HTTP polling. |
| Scheduled jobs or background workers | No | [Scheduled jobs](/docs/capabilities#scheduled-jobs) and [workers](/docs/capabilities#workers) are not available. |
| Heavy processing or more than 256MB | No | Going over 256MB is an [out-of-memory kill](/docs/troubleshoot#oom-killed). The limit cannot be raised. |

If your app needs a managed database, Embarko is the wrong host for it. The overview lists [when Embarko is the wrong choice](/docs/overview#not-right-when).

## [Four checks before you deploy](#checks)

Your agent can usually fix these, but it helps to know them. The [agent quickstart](/docs/agent-quickstart#before) has the same list.

- **Read the port from `PORT` and listen on `0.0.0.0`.** If the code uses a fixed port number, change it. A fixed port, or `localhost` only, never goes live.
- **Delete any Dockerfile and keep the manifest at the top.** Embarko builds the app itself and [rejects a Dockerfile](/docs/limitations#build-runtime-customization). One wrapping folder is fixed automatically, but a manifest buried deeper gets a [`422 no_manifest_at_root`](/docs/troubleshoot#422-no_manifest_at_root).
- **Use the production start command.** Dev servers such as `vite dev` are the most common reason an app [runs out of memory](/docs/troubleshoot#oom-killed).
- **Keep secrets out of the folder.** Leave `.env` files out of the archive. Anything you include ships with the app.

## [How to deploy a Replit app to Embarko, step by step](#steps)

### [1. Download the project from Replit](#step-1)

In your Replit project, select the three-dot menu at the top of the file tree and choose **Download as zip**. If the download fails, Replit's help page says to open a Shell, run `zip -r project.zip .`, and download `project.zip` from the file tree.

**What success looks like:** a `.zip` on your computer. Unzip it and open the folder that holds your manifest (`package.json`, `requirements.txt` or `index.html`).

> Menu names are from [Replit's help page](https://docs.replit.com/help/projects-and-files) as of October 2026. Check that page if your workspace looks different.

### [2. Open the folder in an AI agent](#step-2)

Use any agent that can run terminal commands in your project folder. Embarko's pages name Claude Code and Cursor, and say that if an AI tool built your app, Embarko can host it. Only Claude has an [Embarko connector](/docs/connectors), and the connector deploys from a public `.tar.gz` link, so it cannot upload a folder from your laptop. For a Replit export, use the deployment prompt.

### [3. Paste the deployment prompt](#step-3)

Open [embarko.ai](/), copy the deployment prompt and paste it into the agent. Then add one line:

```text
I exported this from Replit, help me get it live on Embarko
```

The agent may ask how you want to sign in. Skip the connector option unless you use Claude. Pick **token by email** (give your email, then paste the token from your inbox) or create a token at [embarko.ai/app/tokens](/app/tokens). With a token the app goes into your account from the start. If you skip, the app works but is deleted after 24 hours unless you claim it. The [three ways in](/docs/capabilities#agent-auth) explains each option.

### [4. Let the agent upload it](#step-4)

The agent packs the folder as a `.tar.gz`, leaving out `node_modules`, `.git` and `.env` files. It then uploads the archive and checks the status about every 10 seconds until it reads `live`. A static site is usually live in the first reply. A server app has to build first.

- **A first reply of `202 Accepted` is not the finish line.** It only means the build started. See [202 Accepted is not live](/docs/troubleshoot#202-accepted-misread-as-live-deploy).
- **The upload fails with a network error or `403 host_not_allowed`?** Your agent's sandbox is blocking Embarko, and nothing was deployed. Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app`, use the connector if you use Claude, or run the commands in your own terminal. See [what to do when the API is unreachable](/docs/agent-playbook#no-connectivity).

### [5. Open your link and claim it](#step-5)

When the status is `live`, the agent gives you `your-app-name.embarko.app`. Open it and click around. Then ask the agent to [make it permanent](/docs/agent-playbook#claim): it asks for your email, Embarko emails you a token, you paste the token into the chat, and the agent redeploys the same name. The link does not change.

## [Move your data and secrets by hand](#data)

- **Data.** If your Replit app kept data in a database you set up there, that data is not in the zip. For a small app, open a SQLite file at a path under the `DATA_DIR` environment variable. It survives redeploys, but it is [not backed up](/docs/limitations#persistence).
- **Secrets.** Add each API key as an [environment variable](/docs/capabilities#secrets) after you claim the app: write the value, then apply it. A write alone [does not reach the running app](/docs/troubleshoot#env-var-changes-need-a-redeploy-to-reach-the-running-app). Static sites cannot have environment variables.

> **No repo means no safety net.** Embarko has no automatic backups yet, and its docs recommend you [keep your own source history](/docs/limitations#persistence). Keep the zip, or put the folder in a local Git repository.

## [If something goes wrong](#errors)

| What you see | Likely cause | Fix |
|---|---|---|
| A network error, or [`403 host_not_allowed`](/docs/agent-playbook#no-connectivity) | The agent's sandbox blocks Embarko. Nothing was deployed. | Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app`, or run the commands yourself. |
| [`422 no_manifest_at_root`](/docs/troubleshoot#422-no_manifest_at_root) | The manifest is in a subfolder of the zip | Repackage so `package.json` or `requirements.txt` is at the top of the archive. |
| [Exit code 137](/docs/troubleshoot#oom-killed) | The app went over 256MB, often a dev server | Switch to the production start command. |
| [`409 app_name_taken`](/docs/troubleshoot#409-app_name_taken) | Another company owns that name | Pick a different name. Do not retry it. |
| The app loads but its data is empty | Replit data did not come with the zip | Recreate the data. For small apps, store it in SQLite under `DATA_DIR`. |
| [App gone after a day](/docs/troubleshoot#your-app-disappears-24-hours-after-an-anonymous-deploy) | It was never claimed | Deploy it again with a token so it is kept. |

Other codes are in the [troubleshooting reference](/docs/troubleshoot#quick-lookup-by-code).

## [FAQ](#faq)

### [Can I deploy a Replit app for free?](#faq-free)

Yes, if it fits. Download the project as a zip from Replit, open the folder in an AI agent and paste Embarko's deployment prompt. Embarko's Free plan lists unlimited static websites and 1 dynamic app for $0 a month, with Embarko branding. Plans can change, so check [embarko.ai/pricing](/pricing).

### [Do I need GitHub to move a Replit app?](#faq-github)

No. Embarko takes the project folder directly, so there is no repo to create or connect. Because no repo holds your code, [keep your own copy](/docs/limitations#persistence).

### [Will my Replit database and secrets move over?](#faq-data)

No. A zip holds your files. Recreate the values you stored in Replit's Secrets tool as [environment variables](/docs/capabilities#secrets) once the app is claimed. Embarko has [no managed database](/docs/capabilities#database), so small apps can use SQLite under `DATA_DIR`, and apps that need Postgres or MySQL do not fit.

### [Does Embarko have a Replit integration?](#faq-integration)

Embarko's docs describe no Replit-specific integration. Only Claude has an [Embarko connector](/docs/connectors). For a Replit export, use the deployment prompt in an agent that can run commands, or deploy with a token by email.

### [Will the app stay online?](#faq-stay-online)

Not automatically. An app deployed without a token is deleted 24 hours after its first deploy, with no reminder email. Ask your agent to [claim it](/docs/agent-playbook#claim) and it stays at the same link.

### [What if my Replit app needs a managed database?](#faq-database)

Then Embarko is not the right host for that app. It has no Postgres, MySQL or managed backups. If your data is small, you can move it to SQLite under `DATA_DIR`. Otherwise keep the app where its database lives.

## [Built something with AI? Ask it to deploy to Embarko.](#deploy)

Export from Replit, paste the prompt into your agent and get a live link without creating a repo. [Get the deployment prompt →](/)

**Keep reading:** [Agent quickstart](/docs/agent-quickstart) · [Troubleshooting reference](/docs/troubleshoot) · [Replit help: projects and files](https://docs.replit.com/help/projects-and-files) · [Pricing](/pricing)
