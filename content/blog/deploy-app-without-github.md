---
title: "How to Deploy an App Without GitHub (No Repo, No Docker)"
meta_description: "Deploy an AI-built app without GitHub: paste one prompt into your agent, get a live HTTPS link. Steps, limits and fixes for common errors."
slug: "deploy-app-without-github"
primary_keyword: "deploy app without github"
secondary_keywords: ["host vibe coded app without github", "deploy without docker", "deploy app without a repo", "put my AI-built app online"]
category: "Guide"
read_minutes: 7
datePublished: "2026-10-07"
dateModified: "2026-10-07"
last_verified: "2026-10-07"
author: "Pushpendra Agrawal"
ai_disclosure: "Drafted with AI assistance and reviewed by a human before publishing."
status: "published"
---

# How to deploy an app without GitHub

**You do not need GitHub to put your app online on Embarko.** Copy the deployment prompt from [embarko.ai](/), paste it into your AI agent (Claude Code, Cursor, Codex and others), and the agent packages your project folder, uploads it, and gives you a live HTTPS link. No repo to create, no Docker to write, and the first deploy needs no account.

```text
localhost:3000   →  one prompt  →   your-app-name.embarko.app
```

## [Key takeaways](#takeaways)

- Embarko takes your **project folder directly**. The agent packs it into a `.tar.gz` file and [uploads it to Embarko's API](/docs/capabilities#deploy). No GitHub repo is involved.
- Your app needs three things: it reads its port from **`PORT`**, it listens on **`0.0.0.0`**, and it has **no Dockerfile** (Embarko works out how to build it, and [rejects an upload that includes one](/docs/limitations#build-runtime-customization)).
- The first deploy is **anonymous**. Unclaimed apps are **deleted after 24 hours**. [Claiming one](/docs/agent-playbook#claim) takes an email and a redeploy.
- Your [live address](/docs/capabilities#default-domain) looks like **`your-app-name.embarko.app`**.
- Without GitHub, **you hold the only copy of your code**. [Keep your own source history](/docs/limitations#persistence).

## [Why most deploys ask for a repo, and why this one doesn't](#why)

Many hosting tools build your app from a Git repository. So you create a repo, push your code, and connect it before anything goes live. That is a lot of setup for a small app your AI agent wrote in one session.

Embarko takes a different route. Your agent sends the source straight to Embarko, and Embarko builds and runs it. The agent does the deploy, reads the status, and reports the result, so you do not click through a dashboard.

## [Before you start: four quick checks](#checks)

Your agent can usually fix these itself, but it helps to know them. Check them before you deploy. The [agent quickstart](/docs/agent-quickstart#before) has the same list for your agent.

- **Read the port from `PORT`.** In Node that is `process.env.PORT`.
- **Listen on `0.0.0.0`.** Not only `localhost`.
- **Keep your build manifest at the top of the project.** Files like `package.json` must sit at the root of the folder, not in a subfolder.
- **Remove any Dockerfile.** AI tools sometimes add one. Delete it or leave it out of the upload: Embarko builds the app itself and rejects a Dockerfile.

### [Also good to know: limits and data](#limits-and-data)

- **Embarko builds it for you.** It [detects the language](/docs/capabilities#deploy) from your files: Node, Python, Go, Ruby, PHP, Rust, Java and plain static sites.
- **Keep it small.** Each app gets **256MB of memory**, which [cannot be raised](/docs/limitations#compute-isolation), and runs as **one process**. Start it with the production command (for example `npm start` after a build), not a dev server such as `vite dev` or `next dev`: dev servers are the most common reason an app runs out of memory.
- **Upload limits.** If your agent uploads the files as JSON (for example from a sandbox that cannot send a file), the limit is 25 MB and 2,000 files. See [deploy limits](/docs/capabilities#deploy).
- **App names.** Lowercase letters, digits and dashes, 3 to 63 characters, not starting or ending with a dash. The name becomes your subdomain and must be unique across all of Embarko. See [app names](/docs/capabilities#identity).
- **Store data in `DATA_DIR`.** Only that directory [survives a redeploy](/docs/capabilities#file-storage), so a SQLite file or uploaded files belong there.

## [Step by step: from folder to live link](#steps)

### [1. Copy the deployment prompt](#step-1)

Open [embarko.ai](/) and copy the deployment prompt. It tells your agent how to deploy, so you do not have to learn the API.

### [2. Paste it into your AI agent, inside your project](#step-2)

Open your project in Claude Code, Cursor, Codex or another AI tool and paste the prompt.

**Using Claude Code?** You can instead install the open [Embarko skill](https://github.com/embarko-ai/skill) and simply say "deploy this to Embarko".

**Using Claude in the browser or desktop app?** Add the [Embarko connector](https://claude.ai/directory/embarko) ([how to connect](/docs/connectors#connect)). Apps it deploys are saved to your account from the start, so there is nothing to claim. It deploys from a public `.tar.gz` link, not from a folder on your computer.

Example ask for your agent:

```text
Deploy my portfolio to Embarko and share the live link
```

### [3. Let the agent do the deploy](#step-3)

It packages the project as a `.tar.gz` (leaving out `node_modules`, `.git` and `.env` files), uploads it to Embarko's deploy API, and [checks the status](/docs/capabilities#status) about every 10 seconds until the app reaches `live`. A static site is usually live straight away.

- **Why "202 Accepted" is not the finish line.** A first response of `202 Accepted` only means the build started. The app is live when the status says `live`. See [202 Accepted is not live](/docs/troubleshoot#202-accepted-misread-as-live-deploy).
- **Agent says it cannot reach Embarko?** If you see something like `403 host_not_allowed`, your AI tool's sandbox is blocking the upload. Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app` in its network settings, use Claude with the Embarko connector, or ask the agent for the deploy commands and run them in your own terminal. Nothing was deployed, so do not wait for a link. See [what to do when the API is unreachable](/docs/agent-playbook#no-connectivity).

### [4. Open your link](#step-4)

When it is live, your agent gives you the address, `your-app-name.embarko.app`. Open it and click around to confirm it works.

### [5. Claim it within 24 hours](#step-5)

An anonymous app is deleted after 24 hours. To keep it, ask your agent to [make it permanent](/docs/agent-playbook#claim). Embarko sends a token to your email, and the agent **redeploys the same app name** with it. You can also create a token yourself in the dashboard at [embarko.ai/app/tokens](/app/tokens). The [three ways to sign in](/docs/capabilities#agent-auth) explains tokens and the connector.

## [Changing the app later](#later)

Ask your agent to redeploy with the same app name. Embarko keeps [deployment history](/docs/capabilities#history), and you can [roll back](/docs/agent-playbook#rollback) to a previous successful build. It keeps only the **last 5**, so [older versions may not be available](/docs/limitations#rollback).

> **No repo means no safety net.** With no GitHub, Embarko is not where your code lives. Its docs recommend you **keep your own source history**. You do not need GitHub for that: a local Git repository, a copy in cloud storage, or a regular backup of the folder all work.

## [If something goes wrong](#errors)

| What you see | Likely cause | Fix |
|---|---|---|
| [`409 app_name_taken`](/docs/troubleshoot#409-app_name_taken) | Someone already uses that name (it becomes the subdomain) | Pick another app name |
| [`422 no_manifest_at_root`](/docs/troubleshoot#422-no_manifest_at_root) | `package.json` (or similar) is in a subfolder | Repackage so it is at the top level |
| [Build exit code 127](/docs/troubleshoot#npm-run-build-did-not-complete-successfully-exit-code-127) | A tool the build calls is missing, or the dependencies live in a subfolder and were never installed | Add the tool to `dependencies` or `devDependencies`, or deploy the subfolder as its own app |
| [Exit code 137](/docs/troubleshoot#oom-killed) | The app went over 256MB (often a dev server) | Use the production start command and remove anything you do not use. See the [troubleshooting reference](/docs/troubleshoot) |
| [App gone after a day](/docs/troubleshoot#your-app-disappears-24-hours-after-an-anonymous-deploy) | It was never claimed | Deploy it again, this time with a token, so it is kept. Next time, claim it within 24 hours |
| [`403 host_not_allowed`](/docs/agent-playbook#no-connectivity) | Your AI tool's sandbox blocks the upload | Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app`, use the Claude connector, or run the deploy commands in your own terminal |

The full list is in the [troubleshooting reference](/docs/troubleshoot).

## [When this is not the right route](#fit)

Embarko is built for small request-and-response apps. The overview explains [when Embarko is the wrong choice](/docs/overview#not-right-when).

**Good fit**

- Internal tools and trackers
- Landing pages and portfolios
- Forms and MVPs
- Small AI chat or RAG interfaces
- Small games and calculators

**Not a fit**

- WebSockets or realtime connections
- [Scheduled jobs](/docs/capabilities#scheduled-jobs) and [background workers](/docs/capabilities#workers)
- GPU workloads
- Heavy processing such as video and image conversion

There are also **no [automatic backups](/docs/capabilities#backups) yet**.

## [FAQ](#faq)

### [Do I need Git at all?](#faq-git)

No. Embarko does not need a Git repository, and your agent uploads the folder directly. See the [agent quickstart](/docs/agent-quickstart).

### [Do I need an account?](#faq-account)

Not for the first deploy. You can [deploy anonymously](/docs/capabilities#anonymous), but unclaimed apps are deleted after 24 hours. [Claiming](/docs/agent-playbook#claim) needs only an email address.

### [Will my .env file be uploaded?](#faq-env)

No. The agent leaves .env files out of the archive. Secrets go in as [environment variables](/docs/capabilities#secrets), which Embarko stores encrypted and write-only. After setting one, [apply it (or redeploy)](/docs/troubleshoot#env-var-changes-need-a-redeploy-to-reach-the-running-app) for it to take effect. Environment variables work on server apps only; [static sites](/docs/capabilities#static-sites) have no process to read them. Your agent can follow [how to add a secret](/docs/agent-playbook#add-secret).

### [Is it free?](#faq-free)

There is a Free plan with **1 dynamic app** and unlimited static websites. Creator is $9/month billed yearly for up to 5 dynamic apps, and Team is $23/month billed yearly for up to 20. See [pricing](/pricing).

### [Can I use my own domain?](#faq-domain)

[Custom domains](/docs/capabilities#custom-domains) are supported, and the [pricing page](/pricing) lists custom domain support on the Creator plan. Your agent [registers the domain](/docs/agent-playbook#add-custom-domain) and you add the DNS record. If it does not start working, see [custom domain troubleshooting](/docs/troubleshoot#custom-domains).

### [Which AI tools can I use?](#faq-tools)

Embarko's site names Claude Code, Cursor, Codex, Bolt, Lovable, v0, Replit and GPT, and says any AI tool works. Claude has a [dedicated connector](/docs/connectors); other tools use the copied prompt ([tool not listed?](/docs/connectors#not-listed)). Browser-based tools may need `embarko.ai`, `ship.embarko.ai` and `*.embarko.app` allowed in their network settings.

## [Built something with AI? Ask it to deploy to Embarko.](#deploy)

Copy the prompt, paste it into your agent, and get a live link without creating a repo. [Get the deployment prompt →](/)

**Keep reading:** [Troubleshooting reference](/docs/troubleshoot) · [Agent quickstart](/docs/agent-quickstart) · [Capabilities](/docs/capabilities) · [Pricing](/pricing)
