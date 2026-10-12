---
title: "How to Deploy from Cursor with One Prompt"
meta_description: "Deploy from Cursor with one prompt: paste Embarko's deployment prompt into Cursor's agent and get a live HTTPS link. No Git or Dockerfile, plus the sandbox fix."
slug: "deploy-from-cursor"
primary_keyword: "deploy from cursor"
secondary_keywords: ["host cursor app", "cursor deploy app", "cursor sandbox network access", "deploy app built with cursor", "cursor sandbox.json allow domain"]
category: "Guide"
cover: "/assets/guides/deploy-from-cursor.png"
cover_alt: "Cursor's agent pastes the Embarko deployment prompt, sandbox.json allows embarko.ai, ship.embarko.ai and *.embarko.app, and the app goes live at your-app-name.embarko.app."
read_minutes: 9
datePublished: "2026-10-12"
dateModified: "2026-10-12"
last_verified: "2026-10-12"
author: "The Embarko team"
status: "published"
---

# How to deploy from Cursor with one prompt

**To deploy from Cursor, paste Embarko's deployment prompt into Cursor's agent.** Copy the prompt from [embarko.ai](/), open your project in Cursor and paste it. The agent packs the folder, uploads it and hands you a live HTTPS link. No Git repo or Dockerfile is needed. If Cursor's sandbox blocks the upload, [allow Embarko's hosts](#sandbox). An app nobody claims is [deleted after 24 hours](/docs/troubleshoot#your-app-disappears-24-hours-after-an-anonymous-deploy).

## [Key takeaways](#takeaways)

- The **"one prompt"** is Embarko's deployment prompt, copied from [embarko.ai](/) and pasted into Cursor's agent. It tells the agent how to deploy, so you never learn the API.
- **Cursor's agent runs the commands:** it packs your folder as a `.tar.gz`, [uploads it](/docs/capabilities#deploy) and [checks the status](/docs/capabilities#status) until the app is `live`. No Git repo, no Dockerfile, no dashboard.
- **Cursor's sandbox blocks network access by default.** If the upload is blocked, add `embarko.ai`, `ship.embarko.ai` and `*.embarko.app` to your `sandbox.json` allowlist, or approve the command.
- **Cursor has no Embarko connector;** only Claude does ([connectors](/docs/connectors)). The prompt route works for any AI tool.
- The first deploy is anonymous and **deleted after 24 hours** unless you [claim it](/docs/agent-playbook#claim). Limits: [256MB of memory, one process](/docs/capabilities#resources), no WebSockets, no [scheduled jobs](/docs/capabilities#scheduled-jobs).

## [What "deploy with one prompt" means in Cursor](#prompt)

Cursor writes your app, but something still has to host it. Embarko is built so the agent does that part: it sends your project straight to Embarko, which builds it, runs it and serves it at `your-app-name.embarko.app`. This guide shows how to host a Cursor app on Embarko without a repo.

Cursor's agent can do this because, in Cursor's own words, it "runs shell commands directly in your terminal" ([Cursor terminal docs](https://cursor.com/docs/agent/tools/terminal)). Your one prompt is the deployment prompt from [embarko.ai](/). The agent reads it, packages the folder, uploads it, and reports the live link. It should also send `cursor` as its agent name, so once you claim the app, its [deploy history](/docs/capabilities#history) shows which agent made each deploy.

## [Before you start: four checks](#checks)

Cursor can usually fix these itself, but it helps to know them. The [agent quickstart](/docs/agent-quickstart#before) has the same list for your agent.

- **Read the port from `PORT` and listen on `0.0.0.0`.** A fixed port, or `localhost` only, never goes live.
- **Remove any Dockerfile and keep the manifest at the top.** Embarko builds the app itself and [rejects a Dockerfile](/docs/limitations#build-runtime-customization). Files like `package.json` must sit at the root of the folder, not in a subfolder.
- **Use the production start command.** Each app gets 256MB of memory, which [cannot be raised](/docs/limitations#compute-isolation). Dev servers such as `vite dev` or `next dev` are the most common reason an app [runs out of memory](/docs/troubleshoot#oom-killed).
- **Keep secrets out of the folder.** The agent must leave `.env` files out of the archive, and anything you include ships with the app. API keys go in later as [environment variables](/docs/capabilities#secrets), after you claim the app.

## [Let Cursor's agent reach Embarko](#sandbox)

This is the step most Cursor deploys trip on. Cursor runs agent commands under a run mode, set in **Settings → Agents → Approvals & Execution**. Under the recommended default, **Auto-review**, allowlisted commands run at once, other shell commands run in Cursor's sandbox when possible, and commands that cannot use the sandbox go to Cursor's classifier for review. If a sandboxed command fails on a sandbox restriction, the agent can run it again outside the sandbox after the classifier reviews it, so the deploy may go through without any change from you.

Inside the sandbox, network access is blocked by default and opened only by your network mode and `sandbox.json`. The default network mode allows your `sandbox.json` list plus Cursor's built-in defaults for common package managers and language tools. The deploy upload goes to Embarko's hosts, so allow them:

| Option | What to do | Good to know |
|---|---|---|
| **Allow Embarko's hosts** (recommended) | Add `embarko.ai`, `ship.embarko.ai` and `*.embarko.app` to `networkPolicy.allow` in `sandbox.json` (example below): `your-project/.cursor/sandbox.json` for this project, or `~/.cursor/sandbox.json` for all of them. | Cursor combines the allow lists from both files. If your team admin has set a network allowlist, it replaces yours, so ask the admin to add these hosts. The same three hosts are the ones Embarko's own skill asks you to allow. |
| **Approve the command** | When Cursor asks about the upload command, review it and approve it. | Check that it only sends your project to `ship.embarko.ai`, and only talks to Embarko's hosts. |
| **Run it yourself** | Ask Cursor for the deploy commands and run them in Cursor's terminal. | Nothing is deployed until the upload succeeds, so do not wait for a link before then. On Windows, ask for PowerShell versions that call `curl.exe` and `tar.exe`. |

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

## [How to deploy from Cursor, step by step](#steps)

### [1. Open the project in Cursor](#step-1)

Open the folder that holds your app and make sure it runs locally. That folder is what gets uploaded.

### [2. Copy the deployment prompt and paste it into Cursor's agent](#step-2)

Open [embarko.ai](/), copy the deployment prompt, and paste it into a new agent chat in Cursor. It tells the agent how to deploy, so you do not have to learn the API.

Example ask to add after the prompt:

```text
I built a web app, help me get it live on Embarko
```

**What happens next:** the agent may first ask how you want to sign in. Skip the connector option, because Cursor does not have one. Pick **token by email** (give your email, then paste the token from your inbox), or create a token at [embarko.ai/app/tokens](/app/tokens). With a token, the app goes into your account and is kept from the start. If you choose skip, the app works but is deleted after 24 hours unless you claim it ([step 5](#step-5)). The [three ways to sign in](/docs/capabilities#agent-auth) explains each option.

### [3. Let the agent do the deploy](#step-3)

It packages the project as a `.tar.gz` (leaving out `node_modules`, `.git` and `.env` files), uploads it to Embarko's deploy API, and checks the status about every 10 seconds until it reaches `live`. A [static site](/docs/capabilities#static-sites) is usually live in the first reply. A server app has to build first, so it takes longer. If Cursor asks you to approve a command, read it before you approve it.

The app name becomes your address. It must be 3-63 characters (lowercase letters, numbers and dashes, with no dash at the start or end) and unique across Embarko. If it is taken, the agent picks another. See [app names](/docs/capabilities#identity).

- **Why "202 Accepted" is not the finish line.** A first response of `202 Accepted` only means the build started. The app is live when the status says `live`. See [202 Accepted is not live](/docs/troubleshoot#202-accepted-misread-as-live-deploy).
- **The upload fails with a network error?** Cursor's sandbox is blocking it, and nothing was deployed. Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app` in `sandbox.json` (see [the section above](#sandbox)), approve the command, or run it in Cursor's terminal yourself.

### [4. Open your link](#step-4)

When it is live, the agent gives you the address, `your-app-name.embarko.app`. Open it and click around. Until you claim it, an HTML page shows a [countdown banner](/docs/troubleshoot#the-in-app-will-be-deleted-banner-doesnt-show-up).

### [5. Claim it within 24 hours](#step-5)

An app deployed without a token is deleted after 24 hours, and there is no reminder email. Ask Cursor to [make it permanent](/docs/agent-playbook#claim). It asks for your email, and Embarko emails you a token. **Paste the token into the chat**, and the agent **redeploys the same name** with it. You can also create a token at [embarko.ai/app/tokens](/app/tokens).

**What success looks like:** the agent tells you the app is now permanent, and the link stays the same.

## [Changing the app later](#later)

Ask Cursor to [redeploy](/docs/capabilities#redeploy) with the same name. Embarko keeps [deployment history](/docs/capabilities#history), and a claimed app can [roll back](/docs/agent-playbook#rollback) to a previous successful build. Only the last 5 builds are kept, so [rollback reaches back at most five builds](/docs/limitations#rollback). Rollback restores code, never data. To use an API key, claim the app, then ask the agent to set it as an [environment variable](/docs/agent-playbook#add-secret) with your Embarko deploy token and apply it: a write alone [does not reach the running app](/docs/troubleshoot#env-var-changes-need-a-redeploy-to-reach-the-running-app). Static sites cannot have environment variables; only server apps can.

> **No repo means no safety net.** With no GitHub, Embarko is not where your code lives, and it has **[no automatic backups](/docs/capabilities#backups) yet**. Its docs recommend you **[keep your own source history](/docs/limitations#persistence)**. A local Git repository, a copy in cloud storage, or a regular backup of the folder all work.

## [If something goes wrong](#errors)

| What you see | Likely cause | Fix |
|---|---|---|
| A network or connection error on the upload | Cursor's sandbox blocks Embarko's hosts. Nothing was deployed. | Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app` in `sandbox.json` ([how](#sandbox)), approve the command, or run it in Cursor's terminal. |
| [`403 host_not_allowed`](/docs/agent-playbook#no-connectivity) | A network sandbox blocks the upload. Nothing was deployed. | Same fix as above. |
| [Exit code 137](/docs/troubleshoot#oom-killed) | The app went over 256MB (often a dev server) | Use the production start command. See [the out-of-memory fix](/docs/troubleshoot#oom-killed). |
| [App gone after a day](/docs/troubleshoot#your-app-disappears-24-hours-after-an-anonymous-deploy) | It was never claimed | Deploy it again, this time with a token, so it is kept. Next time, claim it within 24 hours. |
| Other deploy errors, such as [`409 app_name_taken`](/docs/troubleshoot#409-app_name_taken) or a [`422`](/docs/troubleshoot#build-time-rejections-before-any-build-runs) | The reply's `code` field names the cause | Look the code up in the [troubleshooting reference](/docs/troubleshoot#quick-lookup-by-code). Do not retry a 409 or 422 unchanged. |

## [When this is not the right route](#limits)

Embarko is built for small request-and-response apps. The overview explains [when Embarko is the wrong choice](/docs/overview#not-right-when).

**Good fit**

- Internal tools and dashboards
- Landing pages and portfolios
- Forms and MVPs
- Small AI chat apps or document Q&A tools
- Small games and calculators

**Not a fit**

- WebSockets or realtime push
- [Scheduled jobs](/docs/capabilities#scheduled-jobs) and [background workers](/docs/capabilities#workers)
- GPU workloads
- Heavy processing such as video and image conversion

Every app is public to anyone with the URL, and there is no [private-app option](/docs/capabilities#access-protection) yet. Embarko is in beta.

## [FAQ](#faq)

### [Can Cursor deploy my app?](#faq-can-cursor)

Yes. Cursor's agent runs shell commands in your terminal, so it can follow Embarko's deployment prompt: it packs the project folder, uploads it and returns a live HTTPS link. Copy the prompt from [embarko.ai](/), paste it into Cursor's agent, and approve a command if Cursor asks. No Git repo or Dockerfile is needed.

### [Does Cursor have an Embarko connector?](#faq-connector)

No. Claude is the only AI tool with an [Embarko connector](/docs/connectors). Cursor uses the copied deployment prompt instead, which works for any AI tool. You can also get a deploy token by email, or create one at [embarko.ai/app/tokens](/app/tokens), so the agent can deploy straight to your account.

### [Why does Cursor block the deploy?](#faq-blocked)

Cursor's sandbox blocks network access unless a domain is allowed by your network mode or `sandbox.json`. If the upload fails with a network error, add `embarko.ai`, `ship.embarko.ai` and `*.embarko.app` to the [`sandbox.json` allowlist](#sandbox), approve the command, or run it yourself in Cursor's terminal.

### [Do I need GitHub to deploy from Cursor?](#faq-github)

No. Embarko takes the project folder directly, so there is no repo to create or connect. Without a repo, Embarko is not where your code lives, so [keep your own copy](/docs/limitations#persistence): a local Git repository, a copy in cloud storage or a backup of the folder all work.

### [Will my app stay online?](#faq-stay-online)

Not automatically. An app deployed without a token is deleted 24 hours after its first deploy. To keep it, ask Cursor to [claim it](/docs/agent-playbook#claim): Embarko emails you a token, you paste it into the chat, and the agent redeploys the same name with it. The link stays the same.

### [Is it free?](#faq-free)

There is a Free plan with **1 dynamic app** and unlimited static websites. Creator is $9/month billed yearly for up to 5 dynamic apps, and Team is $23/month billed yearly for up to 20. Prices are from [embarko.ai/pricing](/pricing) and can change.

## [Built something with AI? Ask it to deploy to Embarko.](#deploy)

Copy the prompt, paste it into Cursor, and get a live link without creating a repo. [Get the deployment prompt →](/)

**Keep reading:** [Agent quickstart](/docs/agent-quickstart) · [Troubleshooting reference](/docs/troubleshoot) · [Cursor run modes and sandbox](https://cursor.com/docs/agent/security/run-modes) · [Pricing](/pricing)
