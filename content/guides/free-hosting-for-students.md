---
title: "Free Hosting for Students: Put Your Project Online"
meta_description: "Free hosting for students: put a portfolio, college project or hackathon demo online for $0 with your AI agent, then keep it with your email."
slug: "free-hosting-for-students"
primary_keyword: "free hosting for students"
secondary_keywords: ["free web hosting for students", "free backend hosting for students", "host college project free", "host student project online", "free server for students"]
category: "Guide"
cover: "/assets/guides/free-hosting-for-students.png"
cover_alt: "A student portfolio and a college project deploy for $0 on the Free plan: unlimited static websites and one dynamic app, live at your-app-name.embarko.app."
read_minutes: 12
datePublished: "2026-10-12"
dateModified: "2026-10-19"
last_verified: "2026-10-19"
author: "The Embarko team"
status: "published"
---

# Free hosting for students: put your project online for $0

**Students can host a project for free on Embarko's Free plan, which lists unlimited static websites and 1 dynamic app.** You build with an AI tool, paste Embarko's deployment prompt into it, and the agent uploads the project and returns a live link at `your-app-name.embarko.app`. When the agent offers to keep it, give your email: Embarko mails you a token, you paste it back, and the project stays at the same link. There's no GitHub repo and no Dockerfile to deal with.

## [Key takeaways](#takeaways)

- Hosting means putting your project on a server with a public address. Free options differ in what they run: plain files, small apps or a whole machine.
- The Free plan is $0 a month. It lists unlimited static websites and 1 dynamic app, and Embarko branding stays on. Prices are from [embarko.ai/pricing](/pricing) and can change.
- It's the same Free plan for everyone. The pricing page lists no student verification and no separate student plan.
- Your AI agent does the deploy. Paste the deployment prompt from [embarko.ai](/) into the tool that built your project.
- Your first link needs no account. Keep it within 24 hours by giving your email, and do it before your demo or submission.

## [What "free hosting" means for a student project](#what)

A project on your laptop runs at an address like `localhost:3000`, which only you can open. To show it to a teacher, a recruiter or a hackathon judge, it needs **hosting**: a server that stays on, your project's files copied onto it, and a public address anyone can open.

Student projects usually fall into three groups, and each needs something different from a host:

- **A portfolio or personal site** made of plain files (HTML, CSS, JavaScript). It needs somewhere to serve those files.
- **A college project with a backend**, such as an Express, Flask or FastAPI app. It needs a host that runs code.
- **A hackathon demo** that has to be live on a specific day and keep working while judges try it.

## [Three kinds of free hosting](#kinds)

"Free hosting" covers different things, so it helps to know which one you're looking for:

| Kind | What it gives you | Good for |
|---|---|---|
| **Static site hosting** | Serves plain files. No server code runs. | A portfolio or a page of HTML, CSS and JavaScript. |
| **App hosting** | Runs your code and serves the result. You upload the app and the platform runs it. | A college project with a backend, or a small AI app. |
| **A free server or VPS** | A machine you log into and manage yourself. | Projects that need a machine you can configure. |

Embarko is app hosting that also publishes plain-file static sites, and your AI tool does the upload.

## [Why free hosting gets complicated](#hard)

Free options can ask for more than you may expect:

1. **A GitHub account and a repository**, plus enough Git to push your project.
2. **A host to sign up for and connect**, each with its own dashboard and vocabulary.
3. **Build and start settings**, and sometimes a Dockerfile your AI tool didn't write.
4. **A server to manage**, if you pick a free VPS, including installing and updating things yourself.
5. **Secret keys kept out of your code** and added as environment variables on the host.

That's fair work for a developer. For a project you built with an AI tool the night before a deadline, it's a lot between "it runs" and "here's the link".

## [The usual route compared with Embarko](#compare)

| The usual route | With Embarko |
|---|---|
| Push the project to a GitHub repository | No repository. Your agent [uploads the folder directly](/docs/deploy). |
| Sign up for a host and connect it | Your first link needs no account. |
| Configure the build, maybe add a Dockerfile | No Dockerfile. Embarko [detects the language](/docs/deploy) and builds the app itself. |
| Install and manage a server | You never log in to a server. Embarko runs the app. |

## [What the Free plan gives you](#free-plan)

| On the Free plan | What it means |
|---|---|
| Unlimited static websites | Plain files (HTML, CSS, JavaScript) are static websites. |
| 1 dynamic app | Anything that runs a server, such as Express, Flask or FastAPI, counts as your one dynamic app. |
| Your own Embarko link | Your address is `your-app-name.embarko.app`. |
| Embarko branding | It stays on. |

Using your own domain is listed under the paid Creator plan, not Free. On every plan, an app gets 256MB of memory, which can't be raised.

## [What can a student host for free?](#fit)

Embarko hosts small request-and-response apps: one process, [256MB of memory](/docs/deploy). Find your project in this table.

| Your project | Fits? | What to know |
|---|---|---|
| Portfolio or personal website (HTML, CSS, JavaScript) | Yes | Published as [static files](/docs/static-sites), usually live in the first reply. Listed as unlimited on Free. |
| Mini project in Node.js (Express) or Python (Flask, FastAPI) | Yes | The manifest (`package.json`, `requirements.txt` or `pyproject.toml`) goes at the top of the folder. It runs a server, so it uses your one dynamic app. |
| React or Vite project | Yes | Send the project with its `package.json`, not `dist`. Embarko [builds it and serves it as a website](/docs/deploy), and inner pages load. Values the build reads (`VITE_...`) go in a committed config file, not `.env`. |
| Project with a small database | Yes, with SQLite | Keep a SQLite file under `DATA_DIR`, [the folder that survives redeploys](/docs/data). Keep your own copy of important data. |
| Project that needs MySQL, Postgres or MongoDB | Another route | Embarko has [no managed database](/docs/data). Use SQLite for small data, or keep that project where its database lives. |
| Chat app or game that needs live updates ([WebSockets](/docs/prerequisites)) | Another route | Use regular HTTP polling instead. |
| A job that runs on a schedule | Yes | Put it behind a route and list it under `schedules` in `embarko.json`. Embarko [calls it on time](/docs/schedules) once the app is kept (not `node-cron` inside the app). |
| Background workers | Another route | [Workers](/docs/prerequisites) aren't available. Run the work inside the main app. |
| Machine learning that needs a GPU or more than 256MB | Another route | Run that part elsewhere. Each app runs as one process with [256MB of memory](/docs/deploy), which can't be raised. |

**Delete any Dockerfile** your AI tool added. Embarko builds the app itself and [doesn't use one](/docs/deploy).

## [Is this a free VPS or a free server?](#vps)

No. A VPS gives you a machine to manage. Embarko gives you hosting: your agent uploads the app, Embarko [detects the language and builds it](/docs/deploy), runs it as one process and serves it over HTTPS. You don't install or patch a server. If you need a machine you can configure, background workers or arbitrary ports, a VPS is the right tool for that part.

## [How to deploy a student project for free, step by step](#steps)

**Before you start:** your project runs on your computer, and your AI agent can run commands and reach the internet.

### [1. Build the project with your AI tool and run it locally](#step-1)

Use the tool you already work in. Open the project folder and make sure it runs on your computer. That folder is what gets uploaded. Built it in a browser-based tool? Paste the prompt there, and if that tool can't reach Embarko ([see step 4](#step-4)), download the code to your computer and deploy it from there.

### [2. Copy the deployment prompt](#step-2)

Open [embarko.ai](/) and click **Copy deployment prompt** (on the home page or [pricing](/pricing)), then paste it into your AI agent. Add one line:

```text
I built a project for college, help me get it live on Embarko
```

### [3. Let the agent deploy first](#step-3)

The agent deploys first and asks later. When the project is live, it gives you the link and the time it will be deleted, and offers to keep it (step 5). Already have a deploy token from [embarko.ai/app/tokens](/app/tokens)? Paste it to your agent and the project goes into your account from the start.

If you use Claude, you can add the [Embarko connector](/docs/connectors). Claude is the only AI tool that has one. It sends your files directly, and apps it deploys go straight into your account, so there's nothing to keep. Very large projects may not fit in one tool call; then use the deployment prompt in Claude Code. [Keep a temporary app](/docs/claim) explains how keeping works.

### [4. Wait until the status says live](#step-4)

The agent packs the folder, uploads it and checks the status about every 10 seconds. A static site is usually live in the first reply, and a server app builds first. A first reply of "202 Accepted" only means the build has started, so wait for `live`. See [202 Accepted is not live](/docs/status). When it says `live`, your agent gives you the link, for example `https://your-app-name.embarko.app`. Open it to check.

If the upload fails with a network error or `403 host_not_allowed`, your tool's sandbox is blocking Embarko and nothing was deployed. Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app` in your tool's network settings, or ask your agent for a deploy script and run it in your computer's own terminal. See [which route to use](/docs/prerequisites).

### [5. Keep it, and keep a copy](#step-5)

If you deployed with a token or the connector, the project is already kept. Otherwise it's deleted 24 hours after its first deploy (no reminder email; the agent tells you the exact time). Say yes when the agent offers to keep it, give your email, and paste the token Embarko mails you. The agent redeploys the same name, so the address doesn't change, and it saves the token for later updates. Lost the token? Ask for a new one with the same email; old tokens keep working. See [keep a temporary app](/docs/claim). Then keep your own copy of the code, for example a local Git repository.

## [Hosting a hackathon or college project demo](#demo)

Before demo day or submission:

- **Make sure the project is in your account.** An unkept app disappears 24 hours after its first deploy, with no reminder email.
- **Open the live link on another device.** If it loads there, other people can open it too.
- **Add API keys as environment variables, once the app is kept.** Ask your agent to set each key and apply it. A write alone [doesn't reach the running app](/docs/env-vars). Never leave keys in your code, because the agent leaves `.env` files out of the upload. Static sites can't have environment variables.
- **List it on Showcase if you want people to find it.** A kept app can be added to the public Showcase gallery with a tagline and your name. See [listing on Showcase](/docs/showcase). On your event's own Showcase page, it appears once the organiser approves it, or straight away if the organiser gave you the page's code. [Hackathon organisers](/hackathons) can apply for an event page.

## [If something goes wrong](#errors)

| What you see | Likely cause | Fix |
|---|---|---|
| A network error, or [`403 host_not_allowed`](/docs/connectors) | Your tool's sandbox blocks Embarko. Nothing was deployed. | Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app`, or ask your agent for a deploy script and run it in your own terminal. |
| [Status says crashed](/docs/logs) | It built but stopped running, often over 256MB of memory or the wrong port | Ask your agent to read the logs, fix the cause and redeploy. |
| [`422 no_manifest_at_root`](/docs/errors) | The manifest is in a subfolder | Repackage so it's at the top of the archive. |
| [`409 app_name_taken`](/docs/errors) | Someone else already uses that name | Pick a different name. Don't retry it. |
| [Project gone after a day](/docs/claim) | It was never kept | Deploy it again and keep it this time (give your email when the agent offers). |
| The link doesn't open, or the status says failed or crashed | The project is listening on the wrong port or only on localhost | Ask your agent: "Make my app read its port from the PORT environment variable and listen on 0.0.0.0, then redeploy." |

Other codes are in the [troubleshooting reference](/docs/errors).

## [FAQ](#faq)

### [What is free hosting?](#faq-what)

Hosting means putting your project on a server that stays online and giving it a public address. Free hosting is a plan that does this for $0, usually with some limits. Plain files, small apps and whole servers are different kinds, so check which one your project needs.

### [Is Embarko really free for students?](#faq-free)

Yes, within the Free plan: $0 a month for unlimited static websites and 1 dynamic app, with Embarko branding. Paid plans exist (Creator is $9/month billed yearly, Team $23/month billed yearly), and all prices can change, so check [embarko.ai/pricing](/pricing).

### [Do I need to prove I'm a student?](#faq-proof)

The pricing page lists no student verification, and the Free plan is the same for everyone. To keep your project, give your email when the agent offers: Embarko mails you a token and you paste it back. Without that, or a token or the Claude connector from the start, it's deleted 24 hours after its first deploy.

### [Can I host a college project that uses MySQL or MongoDB?](#faq-database)

Not directly. Embarko has [no managed database](/docs/data), so there's no MySQL, Postgres or MongoDB to connect to. A project with a small amount of data can use SQLite under `DATA_DIR`. A project that needs MySQL, Postgres or MongoDB should keep that part where its database lives.

### [Can I use my own domain on the Free plan?](#faq-domain)

No. The pricing page lists your own domain under Creator, not Free. On Free your address is `your-app-name.embarko.app`, and Embarko branding stays on. If you need your own domain for a submission, check the Creator plan on the pricing page before you start.

### [Will my project stay online after the demo?](#faq-stay-online)

Yes, if it's kept: deployed with a token or the Claude connector, or kept within 24 hours by giving your email and pasting the token Embarko mails you. Otherwise it's deleted 24 hours after its first deploy. After you [keep it](/docs/claim) the link stays the same. Keep your own copy of the code too.

### [Is there a free VPS for students?](#faq-vps)

Embarko isn't a VPS. Your agent uploads the app, Embarko builds it and serves it over HTTPS, and each app runs as a single process with 256MB of memory. You never log in to a server. That suits small AI-built projects, but not background workers or a machine you configure yourself.

### [Is it safe to host my student project online?](#faq-safe)

Keep secret keys out of your project files. The agent leaves `.env` files out of the archive, and once the app is kept you can add keys as [environment variables](/docs/env-vars), which can't be read back once stored. Also remember that anyone with your link can open your project, so if it uses your AI key, set a spending limit with your AI provider if they offer one.

## [Built something with AI? Ask it to deploy to Embarko.](#deploy)

Copy the prompt, paste it into your agent and get a live link for your project without creating a repo. [Get the deployment prompt →](/)

**Keep reading:** [How to deploy an AI app](/guides/how-to-deploy-ai-app) · [Deploy an app without GitHub](/guides/deploy-app-without-github) · [Deploy a Replit app for free](/guides/deploy-replit-app-free) · [Agent quickstart](/docs/quickstart) · [Hackathons](/hackathons) · [Pricing](/pricing)
