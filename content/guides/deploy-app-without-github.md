---
title: "How to Deploy an App Without GitHub (No Repo, No Docker)"
meta_description: "Deploy an AI-built app without GitHub: paste one prompt into your AI tool and get a live HTTPS link. No repo, no Docker. Steps and fixes for common errors."
slug: "deploy-app-without-github"
primary_keyword: "deploy app without github"
secondary_keywords: ["host vibe coded app without github", "deploy without docker", "deploy app without a repo", "put my AI-built app online"]
category: "Guide"
cover: "/assets/guides/deploy-app-without-github.png"
cover_alt: "A project folder with package.json and server.js is packed as a .tar.gz and becomes a live app at your-app-name.embarko.app, with no git repo needed."
read_minutes: 9
datePublished: "2026-10-07"
dateModified: "2026-10-19"
last_verified: "2026-10-19"
author: "Pushpendra Agrawal"
status: "published"
---

# How to deploy an app without GitHub

**You don't need GitHub to put your app online.** Copy the deployment prompt from [embarko.ai](/), paste it into the AI tool that built your app, and the tool packs your project folder, uploads it and hands you a live HTTPS link like `your-app-name.embarko.app`. There's no repository to create and no Docker to write, and your first link needs no account.

## [Key takeaways](#takeaways)

- Many hosts build your app from a Git repository. That means a GitHub account, a few Git commands and a connection to set up before anything goes live.
- You can skip all of it. Your AI tool packs the project folder and [uploads it to Embarko's API](/docs/deploy) directly.
- Your first link needs no account. To keep it past 24 hours, give your tool your email and paste back the token Embarko sends you.
- Embarko isn't where your code lives, so keep your own copy somewhere safe. A local Git repository is enough.

## [Why many hosts ask for a GitHub repo](#why)

Many hosting tools are built around a simple idea: your code lives in a Git repository, and the host watches that repository. Every time you push a change, the host builds your app again and puts the new version online.

That works well for teams and for projects you'll keep changing for months. It also asks you to do several things first:

1. **Make a GitHub account** and create a repository.
2. **Learn enough Git** to push your code there and keep it up to date.
3. **Sign up for a host** and connect it to the repository.
4. **Tell the host how to build and start your app**, which can mean build commands, start commands and sometimes a Dockerfile.

None of that is hard for a developer. For a small app your AI tool wrote in one sitting, it's a lot of setup between "it works" and "here's the link".

## [What "deploying without a repo" means](#what)

There's nothing missing. The repository was only ever a way to get your files to the host. You can send them directly instead:

1. **Pack.** Your project folder becomes one compressed archive, a `.tar.gz` file.
2. **Upload.** The archive goes straight to the host, with no repository in between.
3. **Build.** The host works out the language from your files and builds the app.
4. **Serve.** The app goes live at a public address.

Embarko works this way, and your AI tool does every step for you.

## [The usual route compared with Embarko](#compare)

| The usual route | With Embarko |
|---|---|
| Create a GitHub account and push a repository | No repository. Your tool [uploads the project folder directly](/docs/deploy). |
| Sign up and learn a hosting dashboard | Your first link needs no account. |
| Set build commands and write a Dockerfile | No Dockerfile. Embarko [detects the language](/docs/deploy) and builds the app itself. |
| Watch the build and decode the logs | Your tool [checks the status](/docs/status) and gives you the link. |
| Learn the hosting terms first | Paste one prompt, then approve and keep. |

## [What you can deploy](#fit)

Embarko suits small web apps. Here's how common AI-built apps line up, and what to do if yours needs something else.

| What your AI built | Fits? | What to know |
|---|---|---|
| A plain website | Yes | Keep `index.html` at the top of the folder. Usually live straight away. |
| A Node.js app | Yes | `package.json` at the top. Read the port from `PORT` and listen on `0.0.0.0`. |
| A Python app | Yes | `requirements.txt` or `pyproject.toml` at the top. |
| A React or Vite app | Yes | Send the project with its `package.json` and build script, not a built `dist` folder. Embarko [builds it and serves it as a website](/docs/deploy), and links to inner pages load. Values the build reads (`VITE_…`) go in a committed config file, not `.env`. |
| A small database | Yes, SQLite | Save the file under `DATA_DIR`, [the folder that survives redeploys](/docs/data). Keep your own copy of important data. |
| [Scheduled jobs](/docs/schedules) | Yes, with a schedule | Skip timer libraries like node-cron. Your tool lists the job in `embarko.json` and Embarko calls that route of your app on time ([schedules](/docs/schedules)). Over HTTP the app must be kept first. |
| A frontend and a backend in one project | Two apps | [One deploy is one app](/docs/two-apps). Deploy each folder as its own app. |
| Postgres or MySQL | Another route | Embarko has [no managed database](/docs/data). Use SQLite for small data, or host that app where its database lives. |
| Live updates ([WebSockets](/docs/prerequisites)) | Another route | Use regular HTTP polling instead. |
| Your own AI model, or heavy processing | Another route | Host the model, or run the heavy job, elsewhere and let your app call it. Apps get [256MB of memory and no GPU](/docs/deploy). |

Embarko also detects Go, Ruby, PHP, Rust and Java. Each app runs as one process with [256MB of memory](/docs/deploy), which can't be raised.

**Delete any Dockerfile your AI tool added.** Embarko builds the app itself, and a Dockerfile is a common reason a deploy fails ([quickstart](/docs/quickstart)).

## [Step by step: from folder to live link](#steps)

**Before you start:** your project is open in your AI tool, and the tool can run commands and reach the internet. It asks before it does.

### [1. Copy the deployment prompt](#step-1)

Open [embarko.ai](/) and copy the deployment prompt. It's a ready-made message that tells your AI tool how to deploy, so you don't have to learn the API.

### [2. Paste it into your AI tool, inside your project](#step-2)

Open your project in Claude Code, Cursor, Codex or another AI tool and paste the prompt.

**Using Claude Code?** You can install the open [Embarko skill](/skill) once, then simply ask your tool to deploy.

**Using Claude in the browser or desktop app?** Add the [Embarko connector](https://claude.ai/directory/embarko) ([how to connect](/docs/connectors)). Apps it deploys go straight into your account, so there's nothing to keep. Claude sends your app's files in the chat, so it works even where a sandbox blocks Embarko. Very large apps may not fit in one call: use Claude Code or the [upload page](/docs/prerequisites) instead.

Here's an example of what to ask:

```text
Deploy my portfolio to Embarko and share the live link
```

### [3. Let your tool do the deploy](#step-3)

It packs the project (leaving out `node_modules`, `.git` and `.env` files), uploads it, and [checks the status](/docs/status) about every 10 seconds until the app is `live`. A static site is usually live straight away.

- A first reply of "202 Accepted" only means the build has started. The app is live when the status says `live`. See [202 Accepted is not live](/docs/status).
- If your tool says it can't reach Embarko, see [if something goes wrong](#errors) below.

### [4. Open your link and keep it](#step-4)

Open the address your tool gives you and click around. A link made without signing in is deleted 24 hours after the first deploy, and no reminder email comes, so your tool tells you the exact time. When it offers to keep the app, say yes and give your email. Embarko emails you a token. Paste it back into the chat, and your tool redeploys under the same name, so the app stays at the same address for good ([how keeping works](/docs/claim)).

## [Changing the app later](#later)

Ask your tool to redeploy with the same app name. Embarko keeps [deployment history](/docs/rollback), and you can [roll back](/docs/rollback) to a recent successful build. Embarko keeps your last 5 builds, and a rollback keeps today's settings and data. Over HTTP the app must be kept first. Since your project folder is the only copy of your code, keep your own source history too. A local Git repository, a copy in cloud storage or a regular backup of the folder all work, and none of them need GitHub.

## [If something goes wrong](#errors)

Failed deploys often come down to three things: the app listens on a fixed port or only on `localhost`, a key or setting that lived in a `.env` file is missing on the host, or the project's main file isn't at the top of the folder. Here's what you might see:

| What you see | Likely cause | Fix |
|---|---|---|
| [`403 host_not_allowed`](/docs/errors) or a network error | Your tool's safety settings are blocking the upload. Nothing was deployed. | Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app`, use the Claude connector, or run the deploy commands in your own terminal. |
| [`409 app_name_taken`](/docs/errors) | Someone already uses that name, which becomes the subdomain | Pick another app name. |
| [`422 no_manifest_at_root`](/docs/errors) | `package.json` (or similar) is in a subfolder | Repackage so it's at the top level. |
| [Build exit code 127](/docs/status) | A tool the build calls is missing, or the dependencies live in a subfolder | Add the tool to `dependencies` or `devDependencies`, or deploy the subfolder as its own app. |
| [Status says `crashed`](/docs/logs) | It built but stopped running (for example it needed more than 256MB of memory) | Ask your tool to read the logs ([logs](/docs/logs)), fix the cause and redeploy. |
| [App gone after a day](/docs/claim) | It was never kept | Deploy it again, then say yes when your tool offers to keep it. |
| The link doesn't open, or the status says failed or crashed | The app is listening on the wrong port or only on localhost | Ask your tool: "Make my app read its port from the PORT environment variable and listen on 0.0.0.0, then redeploy." |

Every code is explained in the [troubleshooting reference](/docs/errors).

## [FAQ](#faq)

### [What does it mean to deploy without GitHub?](#faq-meaning)

It means sending your project files straight to the host instead of going through a Git repository. Your AI tool packs the folder into an archive and uploads it, the host builds it, and the app goes live at a public address. GitHub is one way to get files to a host, not a requirement.

### [Do I need Git at all?](#faq-git)

No. Embarko doesn't need a Git repository, and your tool uploads the folder directly. See the [agent quickstart](/docs/quickstart).

### [Do I need an account?](#faq-account)

Not for the first deploy. You can [deploy anonymously](/docs/claim), then keep it by giving your email: Embarko emails a token that your tool uses to make the app permanent. [Keeping an app](/docs/claim) needs only an email address.

### [Will my .env file be uploaded?](#faq-env)

No. Your tool leaves `.env` files out of the archive. Keep secret keys out of your project files and, once the app is kept (or right away if you use the Claude connector), ask your tool to add them as [environment variables](/docs/env-vars). Embarko stores them encrypted and nobody can read them back. Environment variables work on server apps only, because [static sites](/docs/static-sites) have no process to read them. After setting one, [apply it or redeploy](/docs/env-vars). Your tool can follow [how to add a secret](/docs/env-vars).

### [Is it safe to put my app online without a repo?](#faq-safe)

The archive leaves out `.env` files, and secrets are stored encrypted and can't be read back. Also remember that anyone with your link can open your app, so if it uses your AI key, set a spending limit with your AI provider if they offer one.

### [What can I name my app?](#faq-name)

Use lowercase letters, digits and dashes, 3 to 63 characters, not starting or ending with a dash. The name becomes your subdomain and must be unique across all of Embarko, so your tool picks another if it's taken. See [app names](/docs/deploy).

### [Is it free?](#faq-free)

There's a Free plan with **1 dynamic app** and unlimited static websites. Creator is $9/month billed yearly for up to 5 dynamic apps, and Team is $23/month billed yearly for up to 20. See [pricing](/pricing).

### [Can I use my own domain?](#faq-domain)

[Custom domains](/docs/custom-domain) are supported, and the [pricing page](/pricing) lists custom domain support on the Creator plan. You need to own the domain. Your tool [registers it](/docs/custom-domain) and you add the one DNS record it names. If it doesn't start working, see [custom domain troubleshooting](/docs/custom-domain).

### [Which AI tools can I use?](#faq-tools)

Embarko's site names Claude Code, Cursor, Codex, Bolt, Lovable, v0, Replit and GPT, and says any AI tool works. Claude has a [dedicated connector](/docs/connectors). Other tools use the copied prompt ([tool not listed?](/docs/connectors)). Browser-based tools may need `embarko.ai`, `ship.embarko.ai` and `*.embarko.app` allowed in their network settings.

## [Built something with AI? Ask it to deploy to Embarko.](#deploy)

Copy the prompt, paste it into your AI tool and get a live link without creating a repo. [Get the deployment prompt →](/)

**Keep reading:** [How to deploy an AI app](/guides/how-to-deploy-ai-app) · [Troubleshooting reference](/docs/errors) · [Agent quickstart](/docs/quickstart) · [Docs](/docs) · [Pricing](/pricing)
