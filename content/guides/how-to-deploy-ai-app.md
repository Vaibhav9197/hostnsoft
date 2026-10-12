---
title: "How to Deploy an AI App: Which Route Fits Your App"
meta_description: "How to deploy an AI app: pick the right route for a chat UI, a RAG front end or an AI-built app, get a live HTTPS link, and know the limits first."
slug: "how-to-deploy-ai-app"
primary_keyword: "how to deploy ai app"
secondary_keywords: ["deploy ai chat app", "host rag app", "deploy app that calls openai api", "where to put api key when deploying", "deploy app built with ai"]
category: "Guide"
cover: "/assets/guides/how-to-deploy-ai-app.png"
cover_alt: "A live AI chat app at your-app-name.embarko.app keeps its MODEL_API_KEY as an encrypted environment variable and calls a model API hosted elsewhere over HTTPS."
read_minutes: 11
datePublished: "2026-10-07"
dateModified: "2026-10-07"
last_verified: "2026-10-07"
author: "The Embarko team"
status: "published"
---

# How to deploy an AI app

**To deploy an AI app, give your AI agent the project folder and let it upload it.** On Embarko, install the [deploy skill](https://github.com/embarko-ai/skill) or paste the deployment prompt from [embarko.ai](/) into your AI tool, and the agent packs the folder, uploads it and returns a live HTTPS link. It suits small apps, such as a chat UI over a model API. It does not host models: there are no GPUs.

## [Key takeaways](#takeaways)

- "AI app" usually means one of two things: an app that **calls a model API** (a chat UI, a RAG front end), or an app that an **AI coding tool built**. Both deploy the same way. Hosting a model itself is a different job.
- Your agent does the deploy. It packs the folder as a `.tar.gz`, [uploads it to Embarko's API](/docs/capabilities#deploy) and [checks the status](/docs/capabilities#status) until the app is `live`. No Git repo, no Dockerfile, no dashboard.
- The first deploy is anonymous and **deleted after 24 hours** unless you [claim it](/docs/agent-playbook#claim). **You must claim the app before you can set an API key.**
- Limits that matter for AI apps: **no GPUs**, **[256MB of memory](/docs/capabilities#resources)**, **no WebSockets**, no [background workers](/docs/capabilities#workers), and request timeouts and server-sent events are **not confirmed** in the docs.
- Embarko is built for small apps. Heavy models, long jobs and realtime features belong somewhere else.

## [Which route fits your AI app?](#route)

Pick the row that matches what you have. The deploy steps are the same; what changes is how you start and what to watch for.

| What you have | How to start | Watch for |
|---|---|---|
| **A project folder built by an AI coding tool** (Claude Code, Cursor, Codex and others) | The [deploy skill](https://github.com/embarko-ai/skill) or the copied deployment prompt, run by your agent | Nothing extra to set up first. A model API key still needs the [claim step](#step-5) below. If the agent's sandbox blocks the upload, see the fix in [step 3](#step-3) |
| **A chat UI or RAG front end that calls a model API** | The same route. Deploy it as a server app, claim it, then [set the API key](#key) | The key cannot go in the folder. Setting it needs a claimed app |
| **A front end only** (plain HTML, CSS and JS) | The same route. It is published as a [static site](/docs/capabilities#static-sites), usually live within seconds | A static site runs no process, so it cannot hold a secret. If the page calls a model API, do not put the key in the files: anyone can read it. Deploy a small server app that makes the call and holds the key, and have the page call that app |
| **Code that exists only in a Claude chat** | Save the files into a folder and use Claude Code, or add the [Embarko connector](https://claude.ai/directory/embarko) ([how to connect](/docs/connectors#connect)) if the code is already at a public `.tar.gz` link | The connector cannot upload a folder from your computer. A Claude Artifact that calls `window.storage` is [rejected at deploy](/docs/troubleshoot#422-unsupported_storage_pattern): use SQLite under [`DATA_DIR`](/docs/capabilities#file-storage) |
| **A model that needs a GPU**, or your own model weights | Not Embarko. Run the model with a GPU or model-hosting provider, then have your app call it over HTTP | Your app can still run on Embarko and call the model over HTTP |

## [Before you start: four checks](#checks)

Your agent can usually fix these itself, but it helps to know them. The [agent quickstart](/docs/agent-quickstart#before) has the same list for your agent.

- **Read the port from `PORT` and listen on `0.0.0.0`.** A fixed port, or `localhost` only, never goes live.
- **Remove any Dockerfile and keep the manifest at the top.** AI tools sometimes add a Dockerfile; Embarko builds the app itself and [rejects one](/docs/limitations#build-runtime-customization). Files like `package.json` must sit at the root of the folder.
- **Keep secrets out of the folder.** Your agent must leave `.env` files out of the archive (the docs say always exclude them), and anything you do include ships with the app. Your model API key goes in later as an [environment variable](/docs/capabilities#secrets).
- **Read the API key when a request arrives, not when the app starts.** The first deploy has no key yet, and a crashed app is [restarted only a few times](/docs/troubleshoot#crash-loop-exhausted) before it is stopped. Reading the key lazily lets the app start without it.

## [How to deploy an AI app, step by step](#steps)

### [1. Open the project in your AI tool](#step-1)

Start your agent in the folder that holds the app, and make sure it runs locally. That folder is what gets uploaded.

### [2. Give your agent the deploy instructions](#step-2)

**Option A, the skill.** Run this once in your terminal:

```bash
npx skills add embarko-ai/skill --skill embarko-deploy -g
```

This needs Node.js, because the command uses `npx`. The skill packages and deploys for you, and its source is at [embarko.ai/skill](https://github.com/embarko-ai/skill), which opens the public GitHub page for the skill. If `npx` is not found, install Node.js or use Option B, which needs nothing installed.

**Option B, the prompt.** Open [embarko.ai](/), copy the deployment prompt and paste it into your agent. It tells the agent how to deploy, so you do not have to learn the API.

Example ask for your agent:

```text
I built a web app, help me get it live on Embarko
```

### [3. Let the agent do the deploy](#step-3)

It packages the project as a `.tar.gz` (leaving out `node_modules`, `.git` and `.env` files), uploads it to Embarko's deploy API, and checks the status about every 10 seconds until it reaches `live`. A static site is usually live in the first reply. A server app has to build first, so it takes longer.

- **Why "202 Accepted" is not the finish line.** A first response of `202 Accepted` only means the build started. The app is live when the status says `live`. See [202 Accepted is not live](/docs/troubleshoot#202-accepted-misread-as-live-deploy).
- **Your agent says it cannot reach Embarko?** If you see something like `403 host_not_allowed`, a network sandbox is blocking the upload. Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app` in its network settings, add the [Embarko connector](/docs/connectors) if you use Claude, or ask the agent for the deploy commands and run them in your own terminal. Nothing was deployed, so do not wait for a link. See [what to do when the API is unreachable](/docs/agent-playbook#no-connectivity).

### [4. Open your link](#step-4)

When it is live, your agent gives you the address, `your-app-name.embarko.app`. Open it and click around. Until you add your API key, the AI part of the app will not work yet, and an unclaimed HTML page shows a [countdown banner](/docs/troubleshoot#the-in-app-will-be-deleted-banner-doesnt-show-up). If the status says `crashed` instead of `live`, see the API key check in [Before you start](#checks).

### [5. Claim it within 24 hours](#step-5)

An app deployed without a token is deleted after 24 hours, and there is no reminder email. Ask your agent to [make it permanent](/docs/agent-playbook#claim). It asks for your email, and Embarko emails you a token. **Paste the token back into your agent**, and it **redeploys the same name** with it. You can also create a token at [embarko.ai/app/tokens](/app/tokens).

**What success looks like:** the agent tells you the app is now permanent, and the link stays the same.

## [Add your model API key (after you claim the app)](#key)

An AI app that calls a model API needs a key, and the key must **not** sit in the project folder. Embarko keeps secrets as per-app [environment variables](/docs/capabilities#secrets), encrypted at rest and visible only to your app at runtime. Setting one needs a deploy token, which is why the app has to be claimed first.

1. Claim the app ([step 5](#step-5)).
2. Ask your agent to set your model API key as an environment variable, for example `MODEL_API_KEY`, using your Embarko deploy token (not the model key). Use whatever name your code reads. The agent follows [how to add a secret](/docs/agent-playbook#add-secret).
3. Ask it to **apply** the change, or redeploy. A write alone only stores the value; the running app [keeps the old one until you apply](/docs/troubleshoot#env-var-changes-need-a-redeploy-to-reach-the-running-app).
4. Open the link and test a real request.

**Deployed through the Claude connector?** The app is already in your account, so there is nothing to claim, but setting an environment variable still needs a deploy token. See the [three ways to sign in](/docs/capabilities#agent-auth).

Values are write-only: you can list the keys but never read a value back, so keep your own copy of the key. Environment variables work on server apps only; [static sites](/docs/capabilities#static-sites) cannot hold one.

> **Your link is public, and so is anything behind it.** Embarko has no [private apps](/docs/capabilities#access-protection) and no [built-in login](/docs/capabilities#app-auth) yet, so anyone with the link can use your app, and that spends your model API key. Add your own sign-in or a usage limit, and set a spend limit with your model provider if it offers one.

## [What AI apps run into](#limits-ai)

| Limit | What it means for an AI app | What to do |
|---|---|---|
| **[256MB of memory](/docs/limitations#compute-isolation)**, one process | Loading a large model or a big index into memory can run the app out of memory (exit code `137`). The limit cannot be raised | Keep the app small and call a model API instead of loading a model. Use the production start command, not a dev server |
| **No GPUs** | You cannot run a model that needs one | Host the model elsewhere and call it over HTTP |
| **No WebSockets** | Live push features built on them (chat, live dashboards) deploy but do not work | Poll over plain HTTP from the browser on an interval |
| **Timeouts and server-sent events are unconfirmed** | The docs do not confirm a request timeout, or whether server-sent events work | Test a long model reply before you rely on it, and do not design around a value |
| **No [background workers](/docs/capabilities#workers) or [scheduled jobs](/docs/capabilities#scheduled-jobs)** | Work must finish inside the request that started it | Keep model calls short, or run the long job elsewhere and call your app over HTTP |
| **One folder keeps data** | Only [`DATA_DIR`](/docs/capabilities#file-storage) survives a redeploy. There is no managed database and no [automatic backups](/docs/capabilities#backups) yet | Keep chat history or documents in [SQLite](/docs/capabilities#database) with the file under `DATA_DIR`, and keep your own backup |

## [Changing the app later](#later)

Ask your agent to [redeploy](/docs/capabilities#redeploy) with the same name. Embarko keeps [deployment history](/docs/capabilities#history), and a claimed app can [roll back](/docs/agent-playbook#rollback) to a previous successful build. It keeps only the **last 5**. [Rollback](/docs/capabilities#rollback) restores code, never data.

> **No repo means no safety net.** With no GitHub, Embarko is not where your code lives, and it has **no automatic backups yet**. Its docs recommend you **[keep your own source history](/docs/limitations#persistence)**. A local Git repository, a copy in cloud storage, or a regular backup of the folder all work.

## [If something goes wrong](#errors)

| What you see | Likely cause | Fix |
|---|---|---|
| Other deploy errors, such as [`409 app_name_taken`](/docs/troubleshoot#409-app_name_taken) or a [`422`](/docs/troubleshoot#build-time-rejections-before-any-build-runs) | The reply's `code` field names the cause | Look the code up in the [troubleshooting reference](/docs/troubleshoot#quick-lookup-by-code). Do not retry a 409 or 422 unchanged |
| [Exit code 137](/docs/troubleshoot#oom-killed) | The app went over 256MB (often a dev server, or a model or index loaded into memory) | Use the production start command and load less. See [the out-of-memory fix](/docs/troubleshoot#oom-killed) |
| [`crashed` status right after the first deploy](/docs/troubleshoot#crash-loop-exhausted) | The app needs its API key at startup, and none is set yet. A crashed app is restarted a few times, then stopped | Make the app read the key when a request arrives, then redeploy it with your Embarko token (this also claims it), and [set the key](#key) |
| The app loads but the AI part fails | The API key is missing, or was written but never applied | Set the key as an environment variable on the claimed app, then [apply it or redeploy](/docs/troubleshoot#env-var-changes-need-a-redeploy-to-reach-the-running-app) |
| [`403 host_not_allowed`](/docs/agent-playbook#no-connectivity) | A network sandbox blocks the upload. Nothing was deployed | Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app`, use the Claude connector, or run the deploy commands in your own terminal |

The full list is in the [troubleshooting reference](/docs/troubleshoot).

## [When this is not the right route](#limits)

Embarko is built for small request-and-response apps. The overview explains [when Embarko is the wrong choice](/docs/overview#not-right-when).

**Good fit**

- A chat UI over a model API
- A document question-answering or RAG front end
- A dashboard for an agent or automation you already run
- A wrapper that gives a script a URL and a UI
- Internal tools, forms and prototypes

**Not a fit**

- Anything that needs a GPU, or hosting a model
- WebSockets or realtime push
- [Scheduled jobs](/docs/capabilities#scheduled-jobs) and [background workers](/docs/capabilities#workers)
- Heavy or long-running work, such as video or image processing

A chat UI over a model API is a server (dynamic) app. The Free plan lists **1 dynamic app** and unlimited static websites; see [pricing](/pricing).

Every app is **public to anyone with the URL**, and there is no [private-app option](/docs/capabilities#access-protection) yet. Embarko is in beta.

## [FAQ](#faq)

### [How do I deploy an AI app?](#faq-how)

Give your AI agent the project folder and let it upload it. On Embarko, install the [deploy skill](https://github.com/embarko-ai/skill) or paste the deployment prompt from [embarko.ai](/) into your AI tool. The agent packs the folder, uploads it and returns a live HTTPS link. It suits small apps and does not host models, because there are no GPUs.

### [Can I deploy an app that calls a model API?](#faq-model-api)

Yes. A chat UI over a model API and a RAG front end are both named as good fits. Deploy it as a server app, [claim it](/docs/agent-playbook#claim), then set your API key as an [environment variable](/docs/capabilities#secrets) and apply it. Keys are write-only, so keep your own copy.

### [Where do I put my API key?](#faq-api-key)

In an [environment variable](/docs/capabilities#secrets), never in the project folder. Setting one needs a deploy token, so claim the app first. Write the value, then [apply it or redeploy](/docs/troubleshoot#env-var-changes-need-a-redeploy-to-reach-the-running-app), because a write alone does not reach the running app. Static sites run no process, so they cannot hold a secret.

### [Can I host my own model on Embarko?](#faq-own-model)

No. There are no GPUs and none are planned, and each app gets 256MB of memory, which [cannot be raised](/docs/limitations#compute-isolation). Embarko hosts the app around a model, such as the chat UI. Run the model itself elsewhere and have your app call it over HTTP.

### [Do I need GitHub or Docker to deploy an AI app?](#faq-github-docker)

No. Embarko takes the project folder directly, so there is no repo to create. It also [rejects a Dockerfile](/docs/limitations#build-runtime-customization), because it builds the app itself, so delete one if your AI tool added it. Keep your own copy of the code, since Embarko is not where it lives.

### [Will my AI app stay online?](#faq-stay-online)

Not automatically. An app deployed without a token is deleted 24 hours after its first deploy. To keep it, ask your agent to [claim it](/docs/agent-playbook#claim): Embarko emails you a token, you paste it back, and the agent redeploys the same name with it. The link stays the same.

## [Built something with AI? Ask it to deploy to Embarko.](#deploy)

Install the skill or copy the prompt, and get a live link without creating a repo. [Get the deployment prompt →](/)

**Keep reading:** [Agent quickstart](/docs/agent-quickstart) · [Troubleshooting reference](/docs/troubleshoot) · [Connectors](/docs/connectors) · [Pricing](/pricing)
