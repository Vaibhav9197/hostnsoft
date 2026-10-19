---
title: "How to Deploy an Antigravity Website with One Prompt"
meta_description: "Deploy a website built in Antigravity: paste Embarko's deployment prompt into its agent and get a live HTTPS link. No Git or Dockerfile, plus the sandbox fix."
slug: "deploy-antigravity-website"
primary_keyword: "how to deploy antigravity website"
secondary_keywords: ["antigravity deploy app", "host antigravity app", "antigravity hosting", "deploy website built with antigravity", "antigravity terminal sandbox network"]
category: "Guide"
cover: "/assets/guides/deploy-antigravity-website.png"
cover_alt: "Antigravity's agent asks permission to run the Embarko upload, the user allows it, and the website goes live at your-site-name.embarko.app."
read_minutes: 13
datePublished: "2026-10-12"
dateModified: "2026-10-19"
last_verified: "2026-10-19"
author: "The Embarko team"
status: "published"
---

# How to deploy an Antigravity website with one prompt

**To deploy a website built in Google Antigravity, paste Embarko's deployment prompt into Antigravity's agent.** Copy the prompt from [embarko.ai](/), open your project and paste it. The agent packs the folder, uploads it and hands you a live HTTPS link. No Git repo or Dockerfile is needed. Antigravity may ask you to approve the upload, which is normal. [Here is what to expect](#sandbox).

## [Key takeaways](#takeaways)

- A website Antigravity builds runs on `localhost`, which only your own computer can open. To share it, it needs a host.
- The usual route asks for a GitHub repository, a hosting account, build settings and secret keys.
- With Embarko, the "one prompt" is the deployment prompt copied from [embarko.ai](/). The agent packs the folder, [uploads it](/docs/deploy) and [checks the status](/docs/status) until the site is `live`.
- Antigravity's terminal sandbox can block network access, so expect it to ask before it runs the upload. Read the command and approve it.
- Your first link needs no account. To keep it past 24 hours, give the agent your email and paste the token Embarko sends you. It stays at the same address.

## [Why your Antigravity website isn't online yet](#why)

When Antigravity builds a website, it runs it on your own machine so you can try it. You'll often see an address like `localhost:3000`. "Localhost" simply means "this computer", so a link that starts with it only works for you. Send it to a friend and it points at their computer, where your site doesn't exist.

Putting a site online is called **deploying**. It takes three things: a server that stays on, your site's files copied onto it, and a public address anyone can open. Together that's called **hosting**. Antigravity writes the site, but something else still has to host it.

## [Why deploying from Antigravity gets complicated](#hard)

Antigravity hands you a project that works. The usual route to a host then asks for more than you may expect:

1. **A GitHub account and a repository**, plus enough Git to push the project.
2. **A hosting service.** Vercel, Netlify and others each have their own sign-up, dashboard and vocabulary.
3. **Build and start settings**, and sometimes a Dockerfile Antigravity didn't write.
4. **Secret keys kept out of the code** and added as environment variables on the host.
5. **Permission prompts and sandbox settings.** Antigravity controls which terminal commands the agent may run and whether they get network access, so even a correct deploy command can stop and wait for you.

That's fair work for a developer. For a small site Antigravity wrote in one sitting, it's a long way from "it runs" to "here's the link".

## [The usual route compared with Embarko](#compare)

Embarko is hosting that your AI tool runs for you. Antigravity's agent packs the site, uploads it and checks that it's live.

| The usual route | With Embarko |
|---|---|
| Push the project to a GitHub repository | No repository. The agent [uploads the folder directly](/docs/deploy). |
| Sign up for a host and connect it | Your first link needs no account. |
| Configure the build, maybe add a Dockerfile | No Dockerfile. Embarko [detects the language](/docs/deploy) and builds the site itself. |
| Read the build logs yourself | The agent checks the status and hands you the link. |

## [What "one prompt" means in Antigravity](#prompt)

The one prompt is Embarko's deployment prompt, a ready-made message that tells the agent how to deploy. It works because Antigravity's agent can run terminal commands in your project. Antigravity comes as an app, a command-line tool and an IDE, and Google's docs describe the permission and sandbox settings for each. The agent follows the prompt, packs the folder, uploads it and reports the live link.

## [What to expect when Antigravity asks permission](#sandbox)

The upload is a network call from a terminal command, and Antigravity controls both parts. What happens depends on which Antigravity you use:

| Which Antigravity | What it does by default | What to do |
|---|---|---|
| **The app on macOS or Linux** | The Default preset runs terminal commands in a sandbox with no network access. A command that needs the network runs outside the sandbox and asks for your approval, unless an allow rule covers it. | When the agent asks to run the upload outside the sandbox, read the command and approve it. |
| **The app on Windows** | Windows uses Google's previous permission system, where commands you haven't allowed ask for approval. Terminal sandboxing is a preview option. | Read the upload command and approve it. |
| **The CLI** | The sandbox is off by default (`enableTerminalSandbox` is `false`). With it on, sandboxed commands get no network access by default. | Approve the command if the agent asks. With the sandbox on, approve the run outside the sandbox. |
| **The IDE** | Sandboxing is off by default. **Terminal command auto execution** decides whether the agent asks first. | If you turned on terminal sandboxing, also turn on its network access setting, or run the upload in your own terminal. Strict mode turns the sandbox on with network access denied. |

In the app on macOS and Linux, Google's permission presets are **Default**, **Request Review** and **Turbo**, set under **Settings → General → Permission Settings**. Under Request Review the sandbox is off and terminal commands always ask. In the IDE, **Terminal command auto execution** has two options, **Request Review** and **Always Proceed**, which control whether the agent asks before running terminal commands.

You have three ways to get the upload through:

| Option | What to do | What to know |
|---|---|---|
| **Approve the command** (recommended) | When Antigravity asks to run the upload, read the command and approve it. | Check that it only sends your project to `ship.embarko.ai`. A command approved to run outside the sandbox has no sandbox protection. |
| **Allow Embarko's domains** | In the CLI, Google's docs say domains allowed under `read_url` are added to the sandbox's outbound allowlist. Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app`. | Google's sandbox page doesn't show the exact rule format, so check its [CLI permissions](https://www.antigravity.google/docs/sandbox?tab=cli) for the current syntax. |
| **Run it yourself** | Ask the agent for the deploy commands and run them in your own terminal. | Nothing is deployed until the upload succeeds, so don't wait for a link before then. On Windows, ask for PowerShell versions that call `curl.exe` and `tar.exe`. |

> Setting names and defaults are from Google's [Antigravity permissions](https://www.antigravity.google/docs/permissions), [sandbox](https://www.antigravity.google/docs/sandbox?tab=cli) and [settings](https://www.antigravity.google/docs/settings?tab=ide) pages as of October 2026. Check those pages if your version differs.

## [What you can deploy](#fit)

Embarko suits small web apps. Here's how common Antigravity projects line up, and what to do if yours needs something else.

| What Antigravity built | Fits? | What to know |
|---|---|---|
| A plain website | Yes | Keep `index.html` at the top of the folder. Published as [static files](/docs/static-sites), usually live straight away. |
| A Node.js app | Yes | `package.json` at the top. Read the port from `PORT` and listen on `0.0.0.0`. |
| A Python app | Yes | `requirements.txt` at the top, and a `main.py` that starts the server on `PORT` and `0.0.0.0`. |
| A site with a build step (Vite, Create React App) | Yes | Send the project with its `package.json`, not a built `dist` folder. Embarko builds it and serves it as a website, and links to inner pages load. Build-time values (`VITE_...`) go in a committed config file, not `.env`. |
| A small database | Yes, SQLite | Save the file under `DATA_DIR`, [the folder that survives redeploys](/docs/data). Keep your own copy of important data. |
| A frontend and a backend in one project | Two apps | [One deploy is one app](/docs/two-apps). Deploy each folder as its own app. |
| Postgres or MySQL | Another route | Embarko has [no managed database](/docs/data). Use SQLite for small data, or host that app where its database lives. |
| Live updates ([WebSockets](/docs/prerequisites)) | Another route | Use regular HTTP polling instead. |
| [Scheduled jobs](/docs/schedules) | Yes, as a schedule | List the route under `schedules` in `embarko.json` and Embarko calls it on time. Works on a kept server app. |
| Heavy processing or a GPU | Another route | Run that part elsewhere. Apps get [256MB of memory and no GPU](/docs/deploy). |

**Delete any Dockerfile** Antigravity added. Embarko builds the site itself and [doesn't use one](/docs/deploy).

## [How to deploy from Antigravity, step by step](#steps)

**Before you start:** your site runs locally, and Antigravity's agent can run terminal commands in your project.

### [1. Open the project in Antigravity](#step-1)

Open the folder that holds your site. That folder is what gets uploaded.

### [2. Copy the deployment prompt and paste it into the agent](#step-2)

Click **Copy deployment prompt** on [embarko.ai/pricing](/pricing). Paste it into a new agent chat, then add one line:

```text
I built a website, help me get it live on Embarko
```

The agent deploys first and asks later. When the site is live, it gives you the link and the time it will be deleted, and offers to keep it. Already have a deploy token (create one at [embarko.ai/app/tokens](/app/tokens))? Paste it into the chat and the site is permanent from the first deploy. [Keep a temporary app](/docs/claim) explains how keeping works.

### [3. Approve the upload](#step-3)

Antigravity may ask before running the upload. Read the command, check that it only sends your project to `ship.embarko.ai`, and approve it. [The table above](#sandbox) shows when to expect the prompt.

The agent packs the project (leaving out `node_modules`, `.git` and `.env` files), uploads it, and checks the status about every 10 seconds until it reaches `live`. A static site is usually live in the first reply, and a server app builds first, so it takes longer.

The app name becomes your address: 3 to 63 characters (lowercase letters, numbers and dashes, no dash at the start or end), unique across Embarko. If it's taken, the agent picks another. See [app names](/docs/deploy).

- A first reply of "202 Accepted" only means the build has started. See [202 Accepted is not live](/docs/status).
- If the upload fails with a network error, the sandbox is blocking it and nothing was deployed. See [if something goes wrong](#errors).

### [4. Open your link and keep it](#step-4)

The agent gives you the address, `your-app-name.embarko.app`. Open it and click around. A link made without a token lasts 24 hours, with no reminder email, so the agent tells you the exact time. When it offers to keep the site, give your email, paste the token Embarko emails you, and the agent redeploys the same name. The address doesn't change. [Keep a temporary app](/docs/claim) has the details.

## [Changing the site later](#later)

Ask the agent to [redeploy](/docs/deploy) with the same name. A kept site needs your deploy token for every later deploy, and the agent saves it the first time. You can also create one at [embarko.ai/app/tokens](/app/tokens). A kept app keeps [deployment history](/docs/rollback) and can [roll back](/docs/rollback) to a recent build. Rollback restores code, never data.

To use an API key, keep the app first, then ask the agent to set it as an [environment variable](/docs/env-vars) and apply it. A write alone [doesn't reach the running app](/docs/env-vars). Static sites can't have environment variables. If your site saves anything, such as form entries or a SQLite file, it must write under `DATA_DIR`, because everything else is wiped on each redeploy. Since Embarko isn't where your code lives, keep your own copy too. A local Git repository is enough.

## [If something goes wrong](#errors)

Failed deploys often come down to a blocked upload, a missing key or setting, or a site listening on the wrong port. Here's what you might see:

| What you see | Likely cause | Fix |
|---|---|---|
| A network or connection error on the upload | Antigravity's sandbox blocks Embarko's domains. Nothing was deployed. | Approve the command to run outside the sandbox, allow the domains ([how](#sandbox)), or run it in your own terminal. |
| [`403 host_not_allowed`](/docs/connectors) | A network sandbox blocks the upload. Nothing was deployed. | Same fix as above. |
| The agent keeps asking before every command | Your permission preset or **Terminal command auto execution** is on Request Review | Approve each command, or add the deploy commands to your allowlist. |
| [The status says crashed](/docs/logs) | The site built but stopped running | Ask the agent: "Read the logs, fix what they name, and redeploy." |
| [`422 no_manifest_at_root`](/docs/errors) | The manifest is in a subfolder | Repackage so it's at the top of the archive. |
| [App gone after a day](/docs/claim) | It was never kept | Deploy it again, then keep it when the agent offers: give your email and paste the token Embarko sends you. |
| The link doesn't open, or the status says failed or crashed | The site is listening on the wrong port or only on localhost | Ask the agent: "Make my site read its port from the PORT environment variable and listen on 0.0.0.0, then redeploy." |

Other codes, such as [`409 app_name_taken`](/docs/errors), are in the [troubleshooting reference](/docs/errors). Don't retry a 409 or 422 unchanged.

## [FAQ](#faq)

### [What is Antigravity's terminal sandbox?](#faq-sandbox)

It's a restricted space where Antigravity can run the agent's terminal commands. By default in the app on macOS and Linux, commands run there with no network access, so a command that needs the network, such as an upload, runs outside it and asks for your approval. The CLI and IDE have the sandbox off by default.

### [Can Antigravity deploy my website?](#faq-can-antigravity)

Yes, if its agent can run terminal commands in your project. It follows Embarko's deployment prompt: it packs the folder, uploads it and returns a live HTTPS link. Copy the prompt from [embarko.ai](/), paste it into the agent and approve the command if Antigravity asks. No Git repo or Dockerfile is needed.

### [Does Embarko officially support Antigravity?](#faq-support)

Not by name. Antigravity isn't named in Embarko's docs and has no Embarko connector. Only Claude has one. Embarko's [connectors page](/docs/connectors) says a tool without a connector deploys over the internet instead, when its agent can reach `ship.embarko.ai`. That works in Antigravity when its agent can run terminal commands and you approve the upload.

### [Why does Antigravity ask permission before deploying?](#faq-permission)

By default, the app on macOS and Linux runs commands in a sandbox with no network access, so the agent asks to run the upload outside it. Read the command, check that it only sends your project to `ship.embarko.ai`, and approve it. On Request Review, it asks before any terminal command.

### [Do I need GitHub to deploy from Antigravity?](#faq-github)

No. Embarko takes the project folder directly: the agent packs it and uploads it, so there's no repo to create or connect. Embarko isn't where your code lives, so keep your own copy, such as a local Git repository or a copy of the folder, so you can redeploy an older version later.

### [Will my site stay online?](#faq-stay-online)

Once you keep it, yes. An app deployed without a token is deleted 24 hours after its first deploy. When the agent offers to keep it, give your email and paste the token Embarko emails you, and the agent [redeploys it as yours](/docs/claim). The link stays the same.

### [Is it safe to put my Antigravity site online?](#faq-safe)

Keep secret keys out of your project files. The agent leaves `.env` files out of the archive, and once you've kept the site you can add keys as [environment variables](/docs/env-vars), which Embarko [stores encrypted](/security) and nobody can read back. Also remember that anyone with your link can open the site, so if it uses your AI key, set a spending limit with your AI provider if they offer one.

### [Is it free?](#faq-free)

There's a Free plan with unlimited static websites and **1 dynamic app**. Creator is $9/month billed yearly for up to 5 dynamic apps, and Team is $23/month billed yearly for up to 20. Prices are from [embarko.ai/pricing](/pricing) and can change.

## [Built something with AI? Ask it to deploy to Embarko.](#deploy)

Copy the prompt, paste it into Antigravity's agent, and get a live link without creating a repo. [Get the deployment prompt →](/)

**Keep reading:** [How to deploy an AI app](/guides/how-to-deploy-ai-app) · [Deploy from Cursor](/guides/deploy-from-cursor) · [Agent quickstart](/docs/quickstart) · [Troubleshooting reference](/docs/errors) · [Antigravity permissions](https://www.antigravity.google/docs/permissions) · [Pricing](/pricing)
