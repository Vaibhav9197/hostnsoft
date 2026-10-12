---
title: "How to Deploy an Antigravity Website with One Prompt"
meta_description: "Deploy a website built in Antigravity: paste Embarko's deployment prompt into its agent and get a live HTTPS link. No Git or Dockerfile, plus the sandbox fix."
slug: "deploy-antigravity-website"
primary_keyword: "how to deploy antigravity website"
secondary_keywords: ["antigravity deploy app", "host antigravity app", "antigravity hosting", "deploy website built with antigravity", "antigravity terminal sandbox network"]
category: "Guide"
cover: "/assets/guides/deploy-antigravity-website.png"
cover_alt: "Antigravity's agent asks permission to run the Embarko upload, the user allows it, and the website goes live at your-site-name.embarko.app."
read_minutes: 9
datePublished: "2026-10-12"
dateModified: "2026-10-12"
last_verified: "2026-10-12"
author: "The Embarko team"
status: "published"
---

# How to deploy an Antigravity website with one prompt

**To deploy a website built in Antigravity, paste Embarko's deployment prompt into Antigravity's agent.** Copy the prompt from [embarko.ai](/), open your project and paste it. The agent packs the folder, uploads it and hands you a live HTTPS link. No Git repo or Dockerfile is needed. Antigravity may block the upload until you [approve the command or allow Embarko's domains](#sandbox). An app nobody claims is [deleted after 24 hours](/docs/troubleshoot#your-app-disappears-24-hours-after-an-anonymous-deploy).

## [Key takeaways](#takeaways)

- **The "one prompt" is Embarko's deployment prompt,** copied from [embarko.ai](/) and pasted into Antigravity's agent. It tells the agent how to deploy, so you never learn the API.
- **The agent runs the commands.** It packs your folder as a `.tar.gz`, [uploads it](/docs/capabilities#deploy) and [checks the status](/docs/capabilities#status) until the app is `live`.
- **Antigravity's terminal sandbox can block the upload.** On macOS and Linux in Antigravity 2.0, sandboxed commands run without network access by default. Approve the command, or allow `embarko.ai` and `embarko.app`.
- **Antigravity has no Embarko connector.** Only Claude does ([connectors](/docs/connectors)). The prompt works for any AI tool that can run commands.
- **The first deploy is anonymous and deleted after 24 hours** unless you [claim it](/docs/agent-playbook#claim). Limits: [256MB of memory, one process](/docs/capabilities#resources), no WebSockets, no [scheduled jobs](/docs/capabilities#scheduled-jobs).

## [What "deploy with one prompt" means in Antigravity](#prompt)

Antigravity writes your site, but something still has to host it. Embarko is built so the agent does that part: it sends your project straight to Embarko, which builds it, runs it and serves it at `your-app-name.embarko.app`.

Antigravity comes as a desktop app (Antigravity 2.0), a command-line tool launched with `agy`, and an IDE. Google's docs say agents there work inside your projects, and the IDE has a **Terminal command auto execution** setting for the commands the agent runs. That is what makes this route work: your agent follows the deployment prompt, packages the folder, uploads it and reports the live link.

## [Before you start: four checks](#checks)

Antigravity can usually fix these itself, but it helps to know them. The [agent quickstart](/docs/agent-quickstart#before) has the same list for your agent.

- **Read the port from `PORT` and listen on `0.0.0.0`.** A fixed port, or `localhost` only, never goes live.
- **Remove any Dockerfile and keep the manifest at the top.** Embarko builds the app itself and [rejects a Dockerfile](/docs/limitations#build-runtime-customization). Files like `package.json` must sit at the root of the folder, not in a subfolder. A plain site with an `index.html` is published as [static files](/docs/capabilities#static-sites).
- **Use the production start command.** Each app gets 256MB of memory, which [cannot be raised](/docs/limitations#compute-isolation). Dev servers such as `vite dev` are the most common reason an app [runs out of memory](/docs/troubleshoot#oom-killed).
- **Keep secrets out of the folder.** The agent must leave `.env` files out of the archive, and anything you include ships with the app. API keys go in later as [environment variables](/docs/capabilities#secrets), after you claim the app.

## [Let Antigravity's agent reach Embarko](#sandbox)

This is the step most Antigravity deploys trip on. The upload is a network call from a terminal command, and Antigravity controls both parts.

**Command approval.** In the IDE, **Terminal command auto execution** has two options. **Request Review** makes the agent ask before any terminal command, except commands on your allowlist. **Always Proceed** runs commands without asking, except those on your denylist, and Google labels it high autonomy, high risk. If you use Request Review, read the upload command and approve it.

**Network access.** In Antigravity 2.0 on macOS and Linux, Google's docs say the terminal sandbox is on by default under the Default permission preset, and sandboxed commands run without network access until you approve a domain. On Windows the sandbox is an opt-in preview, and in the CLI `enableTerminalSandbox` is `false` by default. If your sandbox is on, allow Embarko's domains.

| Option | What to do | Good to know |
|---|---|---|
| **Allow Embarko's domains** (recommended) | Add two `read_url` rules: `read_url(embarko.ai)` and `read_url(embarko.app)`. In the CLI, put them in the `allow` list of `~/.gemini/antigravity-cli/settings.json`. In the desktop app, approve the domain in the prompt card when the agent asks. | A `read_url` rule matches the domain and its subdomains, so `embarko.ai` also covers `ship.embarko.ai`, and `embarko.app` covers your app's address. Domains allowed under `read_url` are added to the sandbox's outbound allowlist. |
| **Approve the command** | When Antigravity asks about the upload command, review it and approve it. | Check that it only sends your project to `ship.embarko.ai`. |
| **Run it yourself** | Ask the agent for the deploy commands and run them in your own terminal. | Nothing is deployed until the upload succeeds, so do not wait for a link before then. On Windows, ask for PowerShell versions that call `curl.exe` and `tar.exe`. |

For the CLI, the rules go in a `permissions` object:

```json
{
  "permissions": {
    "allow": ["read_url(embarko.ai)", "read_url(embarko.app)"]
  }
}
```

Google's docs do not say where to type individual `read_url` rules in the 2.0 desktop app, so approve the domain from the prompt card there. If you edit the target in the card, keep it to the domain.

> Setting names and defaults are from Google's [Antigravity permissions](https://www.antigravity.google/docs/permissions), [sandbox](https://www.antigravity.google/docs/sandbox?tab=cli) and [settings](https://www.antigravity.google/docs/settings?tab=ide) pages as of October 2026. Check them if your version differs.

## [How to deploy from Antigravity, step by step](#steps)

### [1. Open the project in Antigravity](#step-1)

Open the folder that holds your site and make sure it runs locally. That folder is what gets uploaded.

### [2. Copy the deployment prompt and paste it into the agent](#step-2)

Open [embarko.ai](/), copy the deployment prompt, and paste it into a new agent chat. Then add one line:

```text
I built a website, help me get it live on Embarko
```

**What happens next:** the agent may ask how you want to sign in. Skip the connector option, because Antigravity does not have one. Pick **token by email** (give your email, then paste the token from your inbox), or create a token at [embarko.ai/app/tokens](/app/tokens). With a token, the app goes into your account and is kept from the start. If you skip, the app works but is deleted after 24 hours unless you claim it ([step 5](#step-5)). The [three ways in](/docs/capabilities#agent-auth) explains each option.

### [3. Approve the upload](#step-3)

The agent packages the project as a `.tar.gz` (leaving out `node_modules`, `.git` and `.env` files), uploads it to Embarko's deploy API, and checks the status about every 10 seconds until it reaches `live`. A static site is usually live in the first reply. A server app has to build first, so it takes longer.

The app name becomes your address: 3-63 characters (lowercase letters, numbers and dashes, no dash at the start or end), unique across Embarko. If it is taken, the agent picks another. See [app names](/docs/capabilities#identity).

- **A first reply of `202 Accepted` is not the finish line.** It only means the build started. See [202 Accepted is not live](/docs/troubleshoot#202-accepted-misread-as-live-deploy).
- **The upload fails with a network error?** The sandbox is blocking it and nothing was deployed. Allow the domains or approve the command ([above](#sandbox)), or run the commands yourself.

### [4. Open your link](#step-4)

When it is live, the agent gives you the address, `your-app-name.embarko.app`. Open it and click around. Until you claim it, an HTML page shows a [countdown banner](/docs/troubleshoot#the-in-app-will-be-deleted-banner-doesnt-show-up).

### [5. Claim it within 24 hours](#step-5)

An app deployed without a token is deleted after 24 hours, with no reminder email. Ask the agent to [make it permanent](/docs/agent-playbook#claim). It asks for your email, Embarko emails you a token, you paste the token into the chat, and the agent redeploys the same name. The link stays the same.

**What success looks like:** the agent tells you the app is now permanent.

## [Changing the site later](#later)

Ask the agent to [redeploy](/docs/capabilities#redeploy) with the same name. A claimed app keeps [deployment history](/docs/capabilities#history) and can [roll back](/docs/agent-playbook#rollback) to a recent build. Only the last 5 builds are kept, and rollback restores code, never data. For an API key, claim the app, then ask the agent to set an [environment variable](/docs/agent-playbook#add-secret) and apply it, because a write alone [does not reach the running app](/docs/troubleshoot#env-var-changes-need-a-redeploy-to-reach-the-running-app). Static sites cannot have environment variables.

> **No repo means no safety net.** With no GitHub, Embarko is not where your code lives, and it has [no automatic backups](/docs/capabilities#backups) yet. Its docs recommend you [keep your own source history](/docs/limitations#persistence). A local Git repository or a copy of the folder both work.

## [If something goes wrong](#errors)

| What you see | Likely cause | Fix |
|---|---|---|
| A network or connection error on the upload | Antigravity's sandbox blocks Embarko's domains. Nothing was deployed. | Allow `embarko.ai` and `embarko.app` ([how](#sandbox)), approve the command, or run it in your own terminal. |
| [`403 host_not_allowed`](/docs/agent-playbook#no-connectivity) | A network sandbox blocks the upload. Nothing was deployed. | Same fix as above. |
| The agent keeps asking before every command | **Terminal command auto execution** is on Request Review | Approve each command, or add the deploy commands to the allowlist. |
| [Exit code 137](/docs/troubleshoot#oom-killed) | The app went over 256MB, often a dev server | Use the production start command. |
| [`422 no_manifest_at_root`](/docs/troubleshoot#422-no_manifest_at_root) | The manifest is in a subfolder | Repackage so it is at the top of the archive. |
| [App gone after a day](/docs/troubleshoot#your-app-disappears-24-hours-after-an-anonymous-deploy) | It was never claimed | Deploy it again with a token so it is kept. |

Other codes, such as [`409 app_name_taken`](/docs/troubleshoot#409-app_name_taken), are in the [troubleshooting reference](/docs/troubleshoot#quick-lookup-by-code). Do not retry a 409 or 422 unchanged.

## [When this is not the right route](#limits)

Embarko is built for small request-and-response apps. The overview explains [when Embarko is the wrong choice](/docs/overview#not-right-when).

**Good fit**

- Landing pages and portfolios
- Internal tools and dashboards
- Forms and MVPs
- Small AI chat apps or document Q&A tools
- Small games and calculators

**Not a fit**

- WebSockets or realtime push
- [Scheduled jobs](/docs/capabilities#scheduled-jobs) and [background workers](/docs/capabilities#workers)
- A managed database such as Postgres or MySQL
- GPU workloads and heavy processing

Every app is public to anyone with the URL, and there is no [private-app option](/docs/capabilities#access-protection) yet. Embarko is in beta.

## [FAQ](#faq)

### [Can Antigravity deploy my website?](#faq-can-antigravity)

Yes, if its agent can run terminal commands in your project. It follows Embarko's deployment prompt: it packs the folder, uploads it and returns a live HTTPS link. Copy the prompt from [embarko.ai](/), paste it into the agent and approve the command if Antigravity asks. No Git repo or Dockerfile is needed.

### [Does Embarko officially support Antigravity?](#faq-support)

Embarko's pages say that if an AI tool built your app, Embarko can host it, and the deployment prompt works from any agent that can run commands. Antigravity is not named on Embarko's pages, and it has no dedicated connector. Only Claude does.

### [Why does Antigravity ask permission before deploying?](#faq-permission)

The upload is a terminal command that makes a network call. With **Terminal command auto execution** on Request Review, the agent asks before any command not on your allowlist. If the sandbox is on, it also blocks network access until you approve a domain. Allow `embarko.ai` and `embarko.app`, or approve the command.

### [Do I need GitHub to deploy from Antigravity?](#faq-github)

No. Embarko takes the project folder directly, so there is no repo to create or connect. Without a repo, [keep your own copy](/docs/limitations#persistence) of the code.

### [Will my site stay online?](#faq-stay-online)

Not automatically. An app deployed without a token is deleted 24 hours after its first deploy. Ask the agent to [claim it](/docs/agent-playbook#claim): you paste an emailed token into the chat and the agent redeploys the same name. The link stays the same.

### [Is it free?](#faq-free)

There is a Free plan with unlimited static websites and **1 dynamic app**. Creator is $9/month billed yearly for up to 5 dynamic apps, and Team is $23/month billed yearly for up to 20. Prices are from [embarko.ai/pricing](/pricing) and can change.

## [Built something with AI? Ask it to deploy to Embarko.](#deploy)

Copy the prompt, paste it into Antigravity's agent, and get a live link without creating a repo. [Get the deployment prompt →](/)

**Keep reading:** [Agent quickstart](/docs/agent-quickstart) · [Troubleshooting reference](/docs/troubleshoot) · [Antigravity permissions](https://www.antigravity.google/docs/permissions) · [Pricing](/pricing)
