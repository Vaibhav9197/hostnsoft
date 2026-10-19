---
title: "How to Host a Website Built with Claude (Free, No GitHub)"
meta_description: "Built a website with Claude? Deploy it with Claude Code or the Embarko connector and get a live HTTPS link. No GitHub or Vercel. Steps, setups and fixes."
slug: "host-website-built-with-claude"
primary_keyword: "host a website built with claude"
secondary_keywords: ["deploy website from claude code", "host claude artifact", "put my claude website online", "claude code deploy website", "embarko claude connector"]
category: "Guide"
cover: "/assets/guides/host-website-built-with-claude.png"
cover_alt: "Claude is asked to deploy a portfolio to Embarko, and the portfolio site goes live at your-site-name.embarko.app."
read_minutes: 14
datePublished: "2026-10-07"
dateModified: "2026-10-19"
last_verified: "2026-10-19"
author: "The Embarko team"
status: "published"
---

# How to host a website built with Claude

**To host a website built with Claude, connect Embarko to Claude once and ask it to deploy, or paste Embarko's deployment prompt into Claude Code.** With the [connector](/docs/connectors), Claude sends your site's files straight to Embarko and the site lands in your account. With Claude Code, the agent packs your project folder and uploads it. A plain site is usually live within a couple of seconds, and a server app builds first, so it takes longer. No GitHub or Vercel is needed.

## [Key takeaways](#takeaways)

- A website Claude builds runs on `localhost`, which only your own computer can open. To share it, it needs a host.
- The usual route to a host asks for a GitHub repository, a hosting account, build settings and secret keys.
- You have two main routes with Embarko: the **Claude connector** (add it once, then ask Claude to deploy) or **Claude Code** (paste the deployment prompt or install the skill).
- With the connector, the site is permanent from the start. With Claude Code, the agent deploys first and asks for your email only after the site is live, then Embarko emails you a token to keep it.
- Anyone with your link can open the site, because Embarko doesn't provide [login or private apps](/docs/app-login) yet.

## [Why your Claude website isn't online yet](#why)

When Claude builds a website, it runs it on your own machine so you can try it. You'll often see an address like `localhost:3000`. "Localhost" simply means "this computer", so a link that starts with it only works for you. Send it to a friend and it points at their computer, where your site doesn't exist.

Putting a site online is called **deploying**. It takes three things: a server that stays on, your site's files copied onto it, and a public address anyone can open. Together that's called **hosting**. Claude builds the site, but something else still has to host it.

## [Why hosting a Claude-built site gets complicated](#hard)

Claude gives you a folder of code that works. The usual route to a host then asks for more than you may expect:

1. **A GitHub account and a repository**, plus enough Git to push the folder Claude made.
2. **A hosting service.** Vercel, Netlify and others each have their own sign-up, dashboard and vocabulary.
3. **Build and start settings**, and sometimes a Dockerfile Claude didn't write.
4. **Secret keys kept out of the code** and added as environment variables on the host.
5. **Build logs** to read when a deploy fails, written for developers.

That's fair work for a developer. For a small site Claude wrote in one sitting, it's a long way from "it runs" to "here's the link".

## [The usual route compared with Embarko](#compare)

Embarko is hosting that your AI tool runs for you. Claude packs or sends the site and checks that it's live.

| The usual route | With Embarko |
|---|---|
| Push Claude's folder to a GitHub repository | No repository. Claude sends the files directly. |
| Sign up for a host such as Vercel | With Claude Code, your first deploy needs no account. |
| Configure the build, maybe add a Dockerfile | No Dockerfile. Embarko [detects the language](/docs/deploy) and builds the site itself. |
| Read the build logs yourself | Claude checks the [status](/docs/status) and hands you the link. |

## [Which Claude did you build it with?](#which)

"Built with Claude" can mean a few different setups, and each has its own route to a live link.

| Where your site lives | Best route | What to know |
|---|---|---|
| **Claude with the Embarko connector** | Ask Claude to deploy. It calls the connector's `deploy_app` tool with your site's files. | No terminal, no token and nothing to keep. It works even where a sandbox blocks Embarko. |
| **Claude Code:** a project folder on your computer | Paste the deployment prompt or install the skill. The agent packs the folder and uploads it over HTTP. | The first deploy needs no account and is temporary until you keep it. |
| **Claude in a chat, with no connector and no terminal** | Add the connector once. If you can't, ask Claude for a `.zip` of the site and use the upload page. | Nothing Claude does from inside the chat can reach Embarko until the connector is added. |
| **A Claude Artifact** | Put the files in a project, then deploy with the connector or Claude Code. | An artifact that calls `window.storage` is [rejected at deploy](/docs/errors). Replace it with SQLite under `DATA_DIR`. |

## [How to host a website built with Claude with the connector](#connector)

A connector lets Claude deploy and manage your apps from inside the chat, signed in as you. Claude is the only AI tool with an Embarko connector today. It needs no token, nothing to install, and it works where a sandbox blocks `ship.embarko.ai`. Only you can add it.

### [1. Add the connector once](#connector-add)

Open [claude.ai/directory/embarko](https://claude.ai/directory/embarko), add Embarko and sign in. It's the same sign-in as embarko.ai, so you'll see the apps and workspaces you already have. If Claude says it can't reach Embarko, it will give you this one link and ask you to connect first.

### [2. Ask Claude to deploy](#connector-deploy)

With the connector added, ask Claude in plain words, for example:

```text
Deploy my portfolio site to Embarko and send me the link
```

Claude calls `deploy_app` with your site's files (text as it is, images and other binaries as base64), then calls `read_app` to check the status until the site is `live`. A plain static site is usually live straight away. You'll get a link like `your-site-name.embarko.app`.

### [3. What the connector can do](#connector-tools)

The connector gives Claude four tools:

| Tool | What it does |
|---|---|
| `deploy_app` | Deploys or updates an app from its files. The app goes straight into your account: permanent, nothing to keep. |
| `read_app` | Shows status, logs, details and analytics. |
| `update_app` | Sets environment variables, connects your own domain, rolls back and sends feedback. |
| `app_danger_zone` | Renames or deletes an app, only after you confirm. |

### [4. Know the limit](#connector-limit)

A connector call carries the whole site inside one tool call, so it's limited by how much Claude can write in one reply, well before the 25MB cap. Send source files only: no `node_modules`, build output or videos. Images the site shows are fine, but very large media (over about 5MB each) should live on an outside host. There's no way to split one deploy across several calls. If your site is too big, use Claude Code with the HTTP upload, or the upload page.

## [How to host a website built with Claude with Claude Code](#claude-code)

Claude Code runs commands in your project folder, so it can use Embarko's HTTP route with no setup.

### [1. Open the project in Claude Code](#cc-step-1)

Start Claude Code in the folder that holds your site, and make sure the site runs locally. That folder is what gets uploaded. Claude Code needs to be able to reach `ship.embarko.ai`, so if a sandbox blocks it, see [if something goes wrong](#errors).

### [2. Give Claude Code the deploy instructions](#cc-step-2)

**Option A, the prompt.** Open [embarko.ai](/), copy the deployment prompt and paste it into Claude Code. It tells the agent to read Embarko's quickstart, deploy anonymously first, give you the live link, and only then ask for your email. You don't have to learn the API.

**Option B, the skill (faster).** Run this once in your terminal:

```bash
npx skills add embarko-ai/skill --skill embarko-deploy -g
```

This needs Node.js, because the command uses `npx`. The skill's source is at [embarko.ai/skill](/skill). If `npx` isn't found, use Option A, which needs nothing installed.

### [3. Let Claude Code deploy it](#cc-step-3)

The agent packs the project (leaving out `node_modules`, `.git` and `.env` files), uploads it, and checks the status about every 10 seconds for a server app, or about every 2 seconds for a static site, until it reaches `live`. It then opens the link itself to check the main feature works and gives you the link and the exact time the site will be deleted if you don't keep it. A first reply of "202 Accepted" only means the build has started, so only `live` counts.

### [4. Keep it](#cc-step-4)

A site deployed without a token is deleted 24 hours after its first deploy, with no reminder email. The agent offers to keep it permanently once it's live. Say yes and give your email: Embarko emails you a token, you paste it back, and the agent redeploys the same name with it. The link stays the same. You'll see "claimed" in the reply when it's done. After that, every later call about the site needs that token, which the agent saves for you.

## [Or upload a zip](#upload)

If Claude can't reach Embarko and you can't add the connector, there's a route that needs no terminal. Ask Claude for the site as a `.zip` to download, then sign in at [embarko.ai/app](/app), choose **Deploy an app** and **Upload file**, and pick the folder or `.zip`. The browser packs it, the site goes into your account, and it's permanent from the start.

## [Is your site static or a server app?](#static)

This decides how it's published and what it can do. Check what Claude built for you:

| What Claude built | How Embarko treats it | What to know |
|---|---|---|
| A folder with `index.html` and its CSS, JS and images | **[Static site.](/docs/static-sites)** Published with no build and no server, usually live within 2 seconds. | No logs, no environment variables and no `DATA_DIR`. A static site can't later become a server app. |
| A Vite, Create React App, Lovable or Bolt project | Built on Embarko, then served as a website. | Send the project with its `package.json` and build script, not a built `dist` folder. No start script or server is needed, and links to inner pages load the app. |
| A site with a Node or Python backend | **Server app, one process.** | It reads its port from `PORT` and listens on `0.0.0.0`. Keep data under `DATA_DIR`, which survives redeploys. |

Values a frontend build reads, such as `VITE_` or `REACT_APP_` ones, can't come from `.env`, because `.env` files are left out of the upload. Put public values in a committed config file. Never put a secret key in frontend code. Secrets belong on a backend.

If your site needs something else, here's the route:

| If your site needs | What to do |
|---|---|
| A database | Embarko has no managed database. Use SQLite with its file under [`DATA_DIR`](/docs/data), and keep your own copy because data isn't backed up. |
| Live updates (WebSockets) | Not supported. Use regular HTTP requests, with the browser polling. |
| [Scheduled jobs](/docs/schedules) | Supported with a schedule. Claude puts the job in a route of your site and lists it under `schedules` in [`embarko.json`](/docs/embarko-json), and Embarko calls that route on time. It works for a server app in your account, not a static site. Don't use a timer library such as `node-cron` inside the app. |
| A frontend and a backend | They're [two apps](/docs/two-apps). Deploy the backend first, point the frontend at its address, and allow the frontend in the backend's CORS. |
| Sign-in or a private site | Embarko doesn't provide [login or private apps](/docs/app-login) yet. Build sign-in into the app itself. |
| More than 256MB of memory | Each app gets 256MB, which can't be raised, so a site that needs more has to stay on a host built for it. |

## [Good to know](#good-to-know)

- **Languages.** Embarko detects Node, Python, Go, Ruby, PHP, Rust, Java and plain static sites.
- **Delete any Dockerfile** Claude added. Embarko builds the site itself, and a Dockerfile is a common reason a deploy fails.
- **Site names.** Lowercase letters, digits and dashes, 3 to 63 characters, not starting or ending with a dash. The name becomes your subdomain and must be unique across all of Embarko. If it's taken, the agent picks a close variant and tells you. Some names, such as `www`, `api`, `app`, `admin`, `docs` and `help`, are reserved.
- **Upload size.** Connector and JSON uploads are limited to 25MB and 2,000 files. A `.tar.gz` upload has no file count limit.

## [Changing the site later](#later)

Ask Claude to deploy again with the same name. With the connector, `deploy_app` updates the same app. With Claude Code, the agent redeploys with your token. Embarko keeps your last 5 builds, so you can [undo a bad update](/docs/rollback): it switches back to an earlier successful deploy with no rebuild, keeps your current environment variables and domains, and never rolls back your data in `DATA_DIR`. Since Embarko isn't where your code lives, keep your own copy too. A local Git repository is enough.

**Your own domain.** You can use a domain you already own. Claude [connects it](/docs/custom-domain) and tells you the exact DNS record, and you add that record where your domain is managed. You can also do it yourself in the dashboard: open [embarko.ai/app](/app), choose the site and open its **Domain** tab. The [pricing page](/pricing) lists your own domain on the Creator plan.

## [If something goes wrong](#errors)

Failed deploys often come down to a blocked upload, a missing key or setting, or a site listening on the wrong port. Here's what you might see. Every code is in the [errors reference](/docs/errors).

| What you see | Likely cause | Fix |
|---|---|---|
| `403 host_not_allowed` or a network error | Your own environment blocks `ship.embarko.ai`. Nothing was deployed. | Switch route: add the connector, or ask for a `.zip` and use the upload page. |
| The status says `failed` | The build failed, for example `Exit code 127` means a command in the build script wasn't found. | Read the [logs](/docs/logs), fix the cause and redeploy with the same name. |
| The status says `crashed` | It built but stopped running. | Read the logs for errors, fix them and redeploy. |
| `409 app_name_taken` or `409 app_name_reserved` | Someone already uses the name, or it's a reserved name. | Pick a different name. Don't retry the same one. |
| `422 no_manifest_at_root` | `package.json` (or similar) is in a subfolder | Package from the folder the error names. |
| `422 app_nested_in_subdirectory` | Your root `package.json` hands the build to a subfolder such as `frontend/` | Deploy the folder named in `deployThisInstead`. A frontend and a backend are two apps. |
| `422 unsupported_storage_pattern` | The site uses `window.storage` (a Claude Artifact feature) | Switch to SQLite with the file under `DATA_DIR`. |
| `413 source_too_large` or `too_many_files` | A connector or JSON upload is over 25MB or 2,000 files | Trim the upload, or use Claude Code's `.tar.gz` upload. |
| The site was deleted after a day | It was never kept | Deploy it again and keep it this time. |
| The link opens but the page doesn't work | The site isn't reading `PORT`, isn't listening on `0.0.0.0`, saves data outside `DATA_DIR`, needs WebSockets, or uses a timer library instead of a [schedule](/docs/schedules) | Fix the cause, then redeploy with the same name. |

## [FAQ](#faq)

### [What does it mean to host a website?](#faq-meaning)

Hosting means putting your site's files on a server that stays online and giving it a public address. Without it, a site built with Claude only exists on your own computer at an address like `localhost:3000`, which nobody else can open.

### [How do I host a website built with Claude?](#faq-how)

Add the [Embarko connector](/docs/connectors) to Claude and ask it to deploy, or paste the deployment prompt from [embarko.ai](/) into Claude Code. Either way you get a live HTTPS link. No GitHub repository or Vercel account is needed, and with Claude Code the first deploy needs no account of any kind.

### [Should I use the connector or Claude Code?](#faq-which)

Use the connector if you work in the Claude chat and want the site permanent from the start with no terminal. Use Claude Code if your project is a folder on your computer, or the site is too big for one connector call. The connector deploys the site's files from the chat, and Claude Code uploads the project folder.

### [Do I need GitHub or Vercel to host a Claude-built site?](#faq-github)

No. Embarko takes your site's files directly, so there's no repo to create and no account to connect. Embarko isn't where your code lives, so [keep your own copy](#later): a local Git repository, a copy in cloud storage or a backup of the folder all work.

### [Will my website stay online?](#faq-stay-online)

Yes, once it's in your account. A site deployed with the connector is permanent from the start. A site deployed over HTTP is deleted 24 hours after its first deploy unless you keep it: Embarko emails you a token, you paste it back, and the agent redeploys the same name with it. The link stays the same.

### [Can I host a Claude Artifact?](#faq-artifact)

Yes, if it works as a normal web app. Put its files in a project and deploy that. An artifact that uses `window.storage` is rejected at deploy with a `422 unsupported_storage_pattern` error. Replace it with SQLite, with the database file under the [`DATA_DIR`](/docs/data) folder, because only that folder survives a redeploy. That makes it a server app, not a static site.

### [Is it safe to put my Claude website online?](#faq-safe)

Keep secret keys out of your project files. The deploy leaves `.env` files out of the upload, and you can add keys as [environment variables](/docs/env-vars), which Embarko stores write-only so nobody can read them back. Also remember that anyone with your link can open the site, so if it uses your AI key, set a spending limit with your AI provider if they offer one.

### [Can I use my own domain?](#faq-domain)

Yes, if you already own one. Claude connects the domain and tells you the one DNS record to add, and you add it where your domain is managed. The [pricing page](/pricing) lists your own domain on the Creator plan. See [own domain](/docs/custom-domain) for the steps.

### [What if Claude can't reach Embarko?](#faq-cannot-reach)

An error such as `403 host_not_allowed` means your environment blocks `ship.embarko.ai` and nothing was deployed. Add the Embarko connector, which works from outside your sandbox, or ask Claude for a `.zip` and use the upload page at [embarko.ai/app](/app).

### [Is it free?](#faq-free)

There's a Free plan with unlimited static websites and **1 dynamic app**, with Embarko branding. Creator is $9/month billed yearly for up to 5 dynamic apps, and Team is $23/month billed yearly for up to 20. Prices are from [embarko.ai/pricing](/pricing) and can change.

## [Built something with AI? Ask it to deploy to Embarko.](#deploy)

Connect Embarko to Claude once, or copy the prompt, and get a live link without creating a repo. [Get the deployment prompt →](/)

**Keep reading:** [How to deploy an AI app](/guides/how-to-deploy-ai-app) · [Deploy an app without GitHub](/guides/deploy-app-without-github) · [Quickstart](/docs/quickstart) · [Connectors](/docs/connectors) · [Errors reference](/docs/errors) · [Pricing](/pricing)
