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
dateModified: "2026-10-14"
last_verified: "2026-10-14"
author: "Pushpendra Agrawal"
status: "published"
---

# How to deploy an app without GitHub

**You don't need GitHub to put your app online.** Copy the deployment prompt from [embarko.ai](/), paste it into the AI tool that built your app, and the tool packs your project folder, uploads it and hands you a live HTTPS link like `your-app-name.embarko.app`. There's no repository to create and no Docker to write, and your first link needs no account.

## [Key takeaways](#takeaways)

- Many hosts build your app from a Git repository. That means a GitHub account, a few Git commands and a connection to set up before anything goes live.
- You can skip all of it. Your AI tool packs the project folder and [uploads it to Embarko's API](/docs/capabilities#deploy) directly.
- Your first link needs no account. Press **Keep** within 24 hours and it stays at the same address.
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
| Create a GitHub account and push a repository | No repository. Your tool [uploads the project folder directly](/docs/capabilities#deploy). |
| Sign up and learn a hosting dashboard | Your first link needs no account. |
| Set build commands and write a Dockerfile | No Dockerfile. Embarko [detects the language](/docs/capabilities#deploy) and builds the app itself. |
| Watch the build and decode the logs | Your tool [checks the status](/docs/capabilities#status) and gives you the link. |
| Learn the hosting terms first | Paste one prompt, then approve and keep. |

## [What you can deploy](#fit)

Embarko suits small web apps. Here's how common AI-built apps line up, and what to do if yours needs something else.

| What your AI built | Fits? | What to know |
|---|---|---|
| A plain website | Yes | Keep `index.html` at the top of the folder. Usually live straight away. |
| A Node.js app | Yes | `package.json` at the top. Read the port from `PORT` and listen on `0.0.0.0`. |
| A Python app | Yes | `requirements.txt` or `pyproject.toml` at the top. |
| A React or Vite app | Yes | [Built first, then run as a server app](/docs/capabilities#static-sites). |
| A small database | Yes, SQLite | Save the file under `DATA_DIR`, [the folder that survives redeploys](/docs/capabilities#file-storage). Keep your own copy of important data. |
| A frontend and a backend in one project | Two apps | [One deploy is one app](/docs/troubleshoot#422-app_nested_in_subdirectory). Deploy each folder as its own app. |
| Postgres or MySQL | Another route | Embarko has [no managed database](/docs/capabilities#database). Use SQLite for small data, or host that app where its database lives. |
| Live updates ([WebSockets](/docs/capabilities#http-endpoints)) | Another route | Use regular HTTP polling instead. |
| [Scheduled jobs](/docs/capabilities#scheduled-jobs) | Another route | Run them elsewhere and have them call your app. |
| Your own AI model, or heavy processing | Another route | Host the model, or run the heavy job, elsewhere and let your app call it. Apps get [256MB of memory and no GPU](/docs/limitations#compute-isolation). |

Embarko also detects Go, Ruby, PHP, Rust and Java. Each app runs as one process with [256MB of memory](/docs/limitations#compute-isolation), which can't be raised.

**Delete any Dockerfile your AI tool added.** Embarko builds the app itself and [rejects an upload that includes one](/docs/limitations#build-runtime-customization).

## [Step by step: from folder to live link](#steps)

**Before you start:** your project is open in your AI tool, and the tool can run commands and reach the internet. It asks before it does.

### [1. Copy the deployment prompt](#step-1)

Open [embarko.ai](/) and copy the deployment prompt. It's a ready-made message that tells your AI tool how to deploy, so you don't have to learn the API.

### [2. Paste it into your AI tool, inside your project](#step-2)

Open your project in Claude Code, Cursor, Codex or another AI tool and paste the prompt.

**Using Claude Code?** You can install the open [Embarko skill](/skill) once, then simply ask your tool to deploy.

**Using Claude in the browser or desktop app?** Add the [Embarko connector](https://claude.ai/directory/embarko) ([how to connect](/docs/connectors#connect)). Apps it deploys are saved to your account from the start, so there's nothing to keep. It deploys from a public `.tar.gz` link, not from a folder on your computer.

Here's an example of what to ask:

```text
Deploy my portfolio to Embarko and share the live link
```

### [3. Let your tool do the deploy](#step-3)

It packs the project (leaving out `node_modules`, `.git` and `.env` files), uploads it, and [checks the status](/docs/capabilities#status) about every 10 seconds until the app is `live`. A static site is usually live straight away.

- A first reply of "202 Accepted" only means the build has started. The app is live when the status says `live`. See [202 Accepted is not live](/docs/troubleshoot#202-accepted-misread-as-live-deploy).
- If your tool says it can't reach Embarko, see [if something goes wrong](#errors) below.

### [4. Open your link and keep it](#step-4)

Open the address your tool gives you and click around. A link made without signing in lasts 24 hours with no reminder email, so press **Keep** on the "keep this app" link your tool shares (or ask it to [make the app permanent](/docs/agent-playbook#claim)) and it stays at the same address.

## [Changing the app later](#later)

Ask your tool to redeploy with the same app name. Embarko keeps [deployment history](/docs/capabilities#history), and you can [roll back](/docs/agent-playbook#rollback) to a recent successful build. Since your project folder is the only copy of your code, keep your own source history too. A local Git repository, a copy in cloud storage or a regular backup of the folder all work, and none of them need GitHub.

## [If something goes wrong](#errors)

Failed deploys often come down to three things: the app listens on a fixed port or only on `localhost`, a key or setting that lived in a `.env` file is missing on the host, or the project's main file isn't at the top of the folder. Here's what you might see:

| What you see | Likely cause | Fix |
|---|---|---|
| [`403 host_not_allowed`](/docs/agent-playbook#no-connectivity) or a network error | Your tool's safety settings are blocking the upload. Nothing was deployed. | Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app`, use the Claude connector, or run the deploy commands in your own terminal. |
| [`409 app_name_taken`](/docs/troubleshoot#409-app_name_taken) | Someone already uses that name, which becomes the subdomain | Pick another app name. |
| [`422 no_manifest_at_root`](/docs/troubleshoot#422-no_manifest_at_root) | `package.json` (or similar) is in a subfolder | Repackage so it's at the top level. |
| [Build exit code 127](/docs/troubleshoot#npm-run-build-did-not-complete-successfully-exit-code-127) | A tool the build calls is missing, or the dependencies live in a subfolder | Add the tool to `dependencies` or `devDependencies`, or deploy the subfolder as its own app. |
| [Exit code 137](/docs/troubleshoot#oom-killed) | The app went over 256MB, often because it runs a dev server | Use the production start command, such as `npm start` after a build, not `vite dev` or `next dev`. |
| [App gone after a day](/docs/troubleshoot#your-app-disappears-24-hours-after-an-anonymous-deploy) | It was never kept | Deploy it again, press **Keep** this time. |
| The link doesn't open, or the status says failed or crashed | The app is listening on the wrong port or only on localhost | Ask your tool: "Make my app read its port from the PORT environment variable and listen on 0.0.0.0, then redeploy." |

Every code is explained in the [troubleshooting reference](/docs/troubleshoot).

## [FAQ](#faq)

### [What does it mean to deploy without GitHub?](#faq-meaning)

It means sending your project files straight to the host instead of going through a Git repository. Your AI tool packs the folder into an archive and uploads it, the host builds it, and the app goes live at a public address. GitHub is one way to get files to a host, not a requirement.

### [Do I need Git at all?](#faq-git)

No. Embarko doesn't need a Git repository, and your tool uploads the folder directly. See the [agent quickstart](/docs/agent-quickstart).

### [Do I need an account?](#faq-account)

Not for the first deploy. You can [deploy anonymously](/docs/capabilities#anonymous) and press **Keep** within 24 hours to make the link permanent. [Keeping an app](/docs/agent-playbook#claim) needs only an email address.

### [Will my .env file be uploaded?](#faq-env)

No. Your tool leaves `.env` files out of the archive. Keep secret keys out of your project files and, once you've pressed **Keep**, ask your tool to add them as [environment variables](/docs/capabilities#secrets). Embarko stores them encrypted and nobody can read them back. Environment variables work on server apps only, because [static sites](/docs/capabilities#static-sites) have no process to read them. After setting one, [apply it or redeploy](/docs/troubleshoot#env-var-changes-need-a-redeploy-to-reach-the-running-app). Your tool can follow [how to add a secret](/docs/agent-playbook#add-secret).

### [Is it safe to put my app online without a repo?](#faq-safe)

The archive leaves out `.env` files, and secrets are stored encrypted and can't be read back. Also remember that anyone with your link can open your app, so if it uses your AI key, set a spending limit with your AI provider if they offer one.

### [What can I name my app?](#faq-name)

Use lowercase letters, digits and dashes, 3 to 63 characters, not starting or ending with a dash. The name becomes your subdomain and must be unique across all of Embarko, so your tool picks another if it's taken. See [app names](/docs/capabilities#identity).

### [Is it free?](#faq-free)

There's a Free plan with **1 dynamic app** and unlimited static websites. Creator is $9/month billed yearly for up to 5 dynamic apps, and Team is $23/month billed yearly for up to 20. See [pricing](/pricing).

### [Can I use my own domain?](#faq-domain)

[Custom domains](/docs/capabilities#custom-domains) are supported, and the [pricing page](/pricing) lists custom domain support on the Creator plan. You need to own the domain. Your tool [registers it](/docs/agent-playbook#add-custom-domain) and you add the one DNS record it names. If it doesn't start working, see [custom domain troubleshooting](/docs/troubleshoot#custom-domains).

### [Which AI tools can I use?](#faq-tools)

Embarko's site names Claude Code, Cursor, Codex, Bolt, Lovable, v0, Replit and GPT, and says any AI tool works. Claude has a [dedicated connector](/docs/connectors). Other tools use the copied prompt ([tool not listed?](/docs/connectors#not-listed)). Browser-based tools may need `embarko.ai`, `ship.embarko.ai` and `*.embarko.app` allowed in their network settings.

## [Built something with AI? Ask it to deploy to Embarko.](#deploy)

Copy the prompt, paste it into your AI tool and get a live link without creating a repo. [Get the deployment prompt →](/)

**Keep reading:** [How to deploy an AI app](/guides/how-to-deploy-ai-app) · [Troubleshooting reference](/docs/troubleshoot) · [Agent quickstart](/docs/agent-quickstart) · [Capabilities](/docs/capabilities) · [Pricing](/pricing)
