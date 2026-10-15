---
title: "How to Deploy from Cursor with One Prompt"
meta_description: "Deploy from Cursor with one prompt: paste Embarko's deployment prompt into Cursor's agent and get a live HTTPS link. No Git or Dockerfile, plus the sandbox fix."
slug: "deploy-from-cursor"
primary_keyword: "deploy from cursor"
secondary_keywords: ["host cursor app", "cursor deploy app", "cursor sandbox network access", "deploy app built with cursor", "cursor sandbox.json allow domain"]
category: "Guide"
cover: "/assets/guides/deploy-from-cursor.png"
cover_alt: "Cursor's agent pastes the Embarko deployment prompt, sandbox.json allows embarko.ai, ship.embarko.ai and *.embarko.app, and the app goes live at your-app-name.embarko.app."
read_minutes: 11
datePublished: "2026-10-12"
dateModified: "2026-10-14"
last_verified: "2026-10-14"
author: "The Embarko team"
status: "published"
---

# How to deploy from Cursor with one prompt

**To deploy from Cursor, paste Embarko's deployment prompt into Cursor's agent.** Copy the prompt from [embarko.ai](/), open your project in Cursor and paste it. The agent packs the folder, uploads it and hands you a live HTTPS link. No Git repo or Dockerfile is needed. If Cursor's sandbox blocks the upload, [allow Embarko's hosts](#sandbox).

## [Key takeaways](#takeaways)

- A Cursor app runs on `localhost`, which only your own computer can open. To share it, it needs a host.
- The usual route asks for a GitHub repository, a hosting account, build settings and secret keys.
- With Embarko, the "one prompt" is the deployment prompt copied from [embarko.ai](/). Cursor's agent packs the folder, [uploads it](/docs/deploy) and [checks the status](/docs/status) until the app is `live`.
- Cursor's sandbox blocks network access by default. If the upload is blocked, add three Embarko hosts to your `sandbox.json` allowlist, or approve the command.
- Your first link needs no account. Press **Keep** within 24 hours and it stays at the same address.

## [Why your Cursor app isn't online yet](#why)

When Cursor builds your app, it runs it on your own machine so you can try it. You'll often see an address like `localhost:3000`. "Localhost" simply means "this computer", so a link that starts with it only works for you. Send it to a friend and it points at their computer, where your app doesn't exist.

Putting an app online is called **deploying**. It takes three things: a server that stays on, your app's files copied onto it, and a public address anyone can open. Together that's called **hosting**. Cursor writes the app, but something else still has to host it.

## [Why deploying from Cursor gets complicated](#hard)

Cursor hands you a project that works. The usual route to a host then asks for more than you may expect:

1. **A GitHub account and a repository**, plus enough Git to push the project.
2. **A hosting service.** Vercel, Netlify and others each have their own sign-up, dashboard and vocabulary.
3. **Build and start settings**, and sometimes a Dockerfile Cursor didn't write.
4. **Secret keys kept out of the code** and added as environment variables on the host.
5. **A sandbox that can block the upload.** Cursor runs agent commands in a sandbox, and network access inside it is blocked by default, so even a correct deploy command can fail until the host is allowed.

That's fair work for a developer. For a small app Cursor wrote in one sitting, it's a long way from "it runs" to "here's the link".

## [The usual route compared with Embarko](#compare)

Embarko is hosting that your AI tool runs for you. Cursor's agent packs the app, uploads it and checks that it's live.

| The usual route | With Embarko |
|---|---|
| Push the project to a GitHub repository | No repository. Cursor's agent [uploads the folder directly](/docs/deploy). |
| Sign up for a host and connect it | Your first link needs no account. |
| Configure the build, maybe add a Dockerfile | No Dockerfile. Embarko [detects the language](/docs/deploy) and builds the app itself. |
| Read the build logs yourself | The agent checks the status and hands you the link. |

## [What "one prompt" means in Cursor](#prompt)

The one prompt is Embarko's deployment prompt, a ready-made message that tells the agent how to deploy. It works because Cursor's agent can run commands: Cursor's own docs say it "runs shell commands directly in your terminal" ([Cursor terminal docs](https://cursor.com/docs/agent/tools/terminal)). The agent reads the prompt, packs the folder, uploads it and reports the live link. It should also send `cursor` as its agent name, so once you keep the app, its [deploy history](/docs/rollback) shows which agent made each deploy.

## [Let Cursor's agent reach Embarko](#sandbox)

This is the step most Cursor deploys trip on, so it helps to know what's happening. Cursor runs agent commands under a run mode, set in **Settings → Agents → Approvals & Execution**. Under the recommended default, **Auto-review**, allowlisted calls run at once, other shell commands run in Cursor's sandbox when possible, and calls that can't use the sandbox go to Cursor's classifier for review. If a sandboxed command fails on a sandbox restriction, the agent can run it again outside the sandbox after the classifier reviews it, so the deploy may go through without any change from you.

Inside the sandbox, network access is blocked by default and opened only by your network mode and `sandbox.json`. The default network mode allows your `sandbox.json` list plus Cursor's built-in defaults for common package managers and language tools. The deploy upload goes to Embarko's hosts, so allow them:

| Option | What to do | What to know |
|---|---|---|
| **Allow Embarko's hosts** (recommended) | Add `embarko.ai`, `ship.embarko.ai` and `*.embarko.app` to `networkPolicy.allow` in `sandbox.json` (example below): `your-project/.cursor/sandbox.json` for this project, or `~/.cursor/sandbox.json` for all of them. | Cursor combines the allow lists from both files. If your team admin has set a network allowlist, it replaces yours, so ask the admin to add these hosts. |
| **Approve the command** | When Cursor asks about the upload command, review it and approve it. | Check that it only sends your project to `ship.embarko.ai`. |
| **Run it yourself** | Ask Cursor for the deploy commands and run them in Cursor's terminal. | Nothing is deployed until the upload succeeds, so don't wait for a link before then. On Windows, ask for PowerShell versions that call `curl.exe` and `tar.exe`. |

Create or open `.cursor/sandbox.json` in your project and add Embarko's hosts to `networkPolicy.allow`. If the file already has an allow list, add the three hosts to it:

```json
{
  "networkPolicy": {
    "allow": ["embarko.ai", "ship.embarko.ai", "*.embarko.app"]
  }
}
```

The full format is in [Cursor's sandbox.json reference](https://cursor.com/docs/reference/sandbox).

> Settings names and defaults are from [Cursor run modes and sandboxing](https://cursor.com/docs/agent/security/run-modes) as of Cursor 3.23 (October 2026). Check that page if your Cursor version differs.

## [What you can deploy](#fit)

Embarko suits small web apps. Here's how common Cursor projects line up, and what to do if yours needs something else.

| What Cursor built | Fits? | What to know |
|---|---|---|
| A plain website | Yes | Keep `index.html` at the top of the folder. Usually live straight away. |
| A Node.js app | Yes | `package.json` at the top. Read the port from `PORT` and listen on `0.0.0.0`. |
| A Python app | Yes | `requirements.txt` or `pyproject.toml` at the top. |
| A React or Vite app | Yes | [Built first, then run as a server app](/docs/static-sites). |
| A small database | Yes, SQLite | Save the file under `DATA_DIR`, [the folder that survives redeploys](/docs/data). Keep your own copy of important data. |
| A frontend and a backend in one project | Two apps | [One deploy is one app](/docs/two-apps). Deploy each folder as its own app. |
| Postgres or MySQL | Another route | Embarko has [no managed database](/docs/data). Use SQLite for small data, or host that app where its database lives. |
| Live updates ([WebSockets](/docs/prerequisites)) | Another route | Use regular HTTP polling instead. |
| [Scheduled jobs](/docs/prerequisites) | Another route | Run them elsewhere and have them call your app. |
| Heavy processing or a GPU | Another route | Run that part elsewhere. Apps get [256MB of memory and no GPU](/docs/deploy). |

**Delete any Dockerfile** Cursor added. Embarko builds the app itself and [rejects an upload that includes one](/docs/deploy).

## [How to deploy from Cursor, step by step](#steps)

**Before you start:** your app runs locally, and Cursor's agent can run commands and reach the internet. If it can't, see [the sandbox section](#sandbox).

### [1. Open the project in Cursor](#step-1)

Open the folder that holds your app. That folder is what gets uploaded.

### [2. Copy the deployment prompt and paste it into Cursor's agent](#step-2)

Open [embarko.ai](/), copy the deployment prompt, and paste it into a new agent chat in Cursor. Here's an example to add after it:

```text
I built a web app, help me get it live on Embarko
```

The agent may first ask how you want to sign in. Skip the connector option, because Cursor doesn't have one. Pick **token by email** (give your email, then paste the token from your inbox), or create a token at [embarko.ai/app/tokens](/app/tokens). With a token, the app goes into your account and is kept from the start. If you skip, the app still works for 24 hours. The [three ways to sign in](/docs/claim) explains each option.

### [3. Let the agent do the deploy](#step-3)

It packs the project (leaving out `node_modules`, `.git` and `.env` files), uploads it, and checks the status about every 10 seconds until it reaches `live`. A [static site](/docs/static-sites) is usually live in the first reply, and a server app builds first, so it takes longer. If Cursor asks you to approve a command, read it before you approve it.

The app name becomes your address. It must be 3 to 63 characters (lowercase letters, numbers and dashes, with no dash at the start or end) and unique across Embarko. If it's taken, the agent picks another. See [app names](/docs/deploy).

- A first reply of "202 Accepted" only means the build has started. The app is live when the status says `live`. See [202 Accepted is not live](/docs/status).
- If the upload fails with a network error, Cursor's sandbox is blocking it and nothing was deployed. See [the sandbox section](#sandbox).

### [4. Open your link and keep it](#step-4)

The agent gives you the address, `your-app-name.embarko.app`. Open it and click around. A link made without a token lasts 24 hours with no reminder email, though an HTML page shows a [countdown banner](/docs/claim). Ask Cursor to [make it permanent](/docs/claim): it asks for your email, Embarko emails you a token, you paste it into the chat, and the agent redeploys the same name. The link stays the same.

## [Changing the app later](#later)

Ask Cursor to [redeploy](/docs/deploy) with the same name. Embarko keeps [deployment history](/docs/rollback), and a kept app can [roll back](/docs/rollback) to a recent successful build. Rollback restores code, never data. Since Embarko isn't where your code lives, [keep your own copy](/docs/data) too. A local Git repository is enough.

To use an API key, keep the app first, then ask the agent to set it as an [environment variable](/docs/env-vars) with your Embarko deploy token and apply it. A write alone [doesn't reach the running app](/docs/env-vars). Static sites can't have environment variables, only server apps can.

## [If something goes wrong](#errors)

Failed deploys often come down to a blocked upload, a missing key or setting, or an app listening on the wrong port. Here's what you might see:

| What you see | Likely cause | Fix |
|---|---|---|
| A network or connection error on the upload | Cursor's sandbox blocks Embarko's hosts. Nothing was deployed. | Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app` in `sandbox.json` ([how](#sandbox)), approve the command, or run it in Cursor's terminal. |
| [`403 host_not_allowed`](/docs/connectors) | A network sandbox blocks the upload. Nothing was deployed. | Same fix as above. |
| [Exit code 137](/docs/deploy) | The app went over 256MB, often because it runs a dev server | Use the production start command, such as `npm start` after a build, not `vite dev` or `next dev`. |
| [App gone after a day](/docs/claim) | It was never kept | Deploy it again and press **Keep** this time. |
| The link doesn't open, or the status says failed or crashed | The app is listening on the wrong port or only on localhost | Ask Cursor: "Make my app read its port from the PORT environment variable and listen on 0.0.0.0, then redeploy." |
| Other deploy errors, such as [`409 app_name_taken`](/docs/errors) or a [`422`](/docs/deploy) | The reply's `code` field names the cause | Look the code up in the [troubleshooting reference](/docs/errors). Don't retry a 409 or 422 unchanged. |

## [FAQ](#faq)

### [What is Cursor's sandbox?](#faq-sandbox)

It's a restricted space where Cursor runs agent commands. Inside it, network access is blocked by default and opened only by your network mode and `sandbox.json`. That's why an upload to a new host can fail until you allow the host's address.

### [Can Cursor deploy my app?](#faq-can-cursor)

Yes. Cursor's agent runs shell commands in your terminal, so it can follow Embarko's deployment prompt: it packs the project folder, uploads it and returns a live HTTPS link. Copy the prompt from [embarko.ai](/), paste it into Cursor's agent, and approve a command if Cursor asks. No Git repo or Dockerfile is needed.

### [Does Cursor have an Embarko connector?](#faq-connector)

No. Claude is the only AI tool with an [Embarko connector](/docs/connectors). Cursor uses the copied deployment prompt instead, which works for any AI tool. You can also get a deploy token by email, or create one at [embarko.ai/app/tokens](/app/tokens), so the agent can deploy straight to your account.

### [Why does Cursor block the deploy?](#faq-blocked)

Cursor's sandbox blocks network access unless a domain is allowed by your network mode or `sandbox.json`. If the upload fails with a network error, add `embarko.ai`, `ship.embarko.ai` and `*.embarko.app` to the [`sandbox.json` allowlist](#sandbox), approve the command, or run it yourself in Cursor's terminal.

### [Do I need GitHub to deploy from Cursor?](#faq-github)

No. Embarko takes the project folder directly, so there's no repo to create or connect. Embarko isn't where your code lives, so [keep your own copy](/docs/data): a local Git repository, a copy in cloud storage or a backup of the folder all work.

### [Will my app stay online?](#faq-stay-online)

Once you press **Keep**, yes. An app deployed without a token is deleted 24 hours after its first deploy. Ask Cursor to [make it permanent](/docs/claim): Embarko emails you a token, you paste it into the chat, and the agent redeploys the same name with it. The link stays the same.

### [Is it safe to put my Cursor app online?](#faq-safe)

Keep secret keys out of your project files. The agent leaves `.env` files out of the archive, and once you've pressed **Keep** you can add keys as [environment variables](/docs/env-vars), which Embarko stores encrypted and nobody can read back. Also remember that anyone with your link can open the app, so if it uses your AI key, set a spending limit with your AI provider if they offer one.

### [Is it free?](#faq-free)

There's a Free plan with **1 dynamic app** and unlimited static websites. Creator is $9/month billed yearly for up to 5 dynamic apps, and Team is $23/month billed yearly for up to 20. Prices are from [embarko.ai/pricing](/pricing) and can change.

## [Built something with AI? Ask it to deploy to Embarko.](#deploy)

Copy the prompt, paste it into Cursor, and get a live link without creating a repo. [Get the deployment prompt →](/)

**Keep reading:** [How to deploy an AI app](/guides/how-to-deploy-ai-app) · [Deploy an app without GitHub](/guides/deploy-app-without-github) · [Agent quickstart](/docs/quickstart) · [Troubleshooting reference](/docs/errors) · [Cursor run modes and sandbox](https://cursor.com/docs/agent/security/run-modes) · [Pricing](/pricing)
