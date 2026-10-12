---
title: "How to Host a Website Built with Claude in 60 Seconds"
meta_description: "Host a website built with Claude: ask Claude Code to deploy it and get a live HTTPS link. No GitHub, no Vercel. Steps, limits and fixes for common errors."
slug: "host-website-built-with-claude"
primary_keyword: "host a website built with claude"
secondary_keywords: ["deploy website from claude code", "host claude artifact", "put my claude website online", "claude code deploy website"]
category: "Guide"
cover: "/assets/guides/host-website-built-with-claude.png"
cover_alt: "Claude Code is asked to deploy a portfolio to Embarko, and the portfolio site goes live at your-site-name.embarko.app."
read_minutes: 11
datePublished: "2026-10-07"
dateModified: "2026-10-07"
last_verified: "2026-10-07"
author: "The Embarko team"
status: "published"
---

# How to host a website built with Claude

**To host a website built with Claude, ask Claude Code to deploy it.** Install Embarko's [deploy skill](https://github.com/embarko-ai/skill) (or paste the deployment prompt from [embarko.ai](/)) and the agent packs your project folder, uploads it and hands you a live HTTPS link. A [static site](/docs/capabilities#static-sites) is usually live within seconds; a server app builds first, so it takes longer. No GitHub or Vercel is needed, and a site nobody claims is [deleted after 24 hours](/docs/troubleshoot#your-app-disappears-24-hours-after-an-anonymous-deploy).

## [Key takeaways](#takeaways)

- **Claude Code can run the whole deploy.** It packs the folder as a `.tar.gz`, [uploads it to Embarko's API](/docs/capabilities#deploy) and [checks the status](/docs/capabilities#status) until the site is live. No Git repo, no Dockerfile, no dashboard.
- **There are two ways to start:** install the skill with `npx skills add embarko-ai/skill --skill embarko-deploy -g` and say "deploy this to Embarko", or paste the deployment prompt you copy from [embarko.ai](/).
- **A plain site** (an `index.html` plus assets) is published as a [static site](/docs/capabilities#static-sites) with no build, usually live within seconds. A site with a build step, such as Vite, runs as a server app and takes longer, because it has to build first.
- **The first deploy is anonymous** and deleted after 24 hours unless you [claim it](/docs/agent-playbook#claim). Claiming takes an email and a redeploy of the same name.
- **Limits to know first:** [256MB of memory, one process](/docs/capabilities#resources), no WebSockets, no [scheduled jobs](/docs/capabilities#scheduled-jobs), no [automatic backups](/docs/capabilities#backups) yet. Every site is [public to anyone with the URL](/docs/capabilities#access-protection).

## [Which Claude did you build it with?](#which)

"Built with Claude" can mean three different setups, and each has a different route to a live link.

| Where your site lives | Best route | Good to know |
|---|---|---|
| **Claude Code:** a project folder on your computer | The [deploy skill](https://github.com/embarko-ai/skill) or the copied prompt. Claude Code uploads the folder directly | Nothing to host first, and no public link needed |
| **The Claude app**, where your site exists only as code in a chat | The [Embarko connector](/docs/connectors), only if your site is already available as a public `.tar.gz` link. Otherwise use Claude Code or the copied prompt | Sites it deploys land in your account from the start, so there is nothing to claim. It cannot upload a folder from your computer, and it has no status tool, so open the link to check the site is up |
| **A Claude Artifact** | Put the files in a project folder, then deploy that folder with Claude Code | An artifact that calls `window.storage` is [rejected at deploy](/docs/troubleshoot#422-unsupported_storage_pattern). Replace it with SQLite, with the file under [`DATA_DIR`](/docs/capabilities#file-storage); that makes it a server app, so check the memory and one-process limits |

> **Is your site only in a Claude chat?** Save the files into a project folder, open that folder in Claude Code and follow the steps below. Pasting the deployment prompt into the chat itself may work, but if the chat environment cannot reach Embarko you will see a `403 host_not_allowed` error. If that happens, use Claude Code.

Claude builds your site, but something still has to host it. A Git repository is one common starting point, but it is a lot of setup for a small site an agent wrote in one session, and Embarko does not need one. All it needs is your project, an agent that can reach Embarko, and your claim within 24 hours if you want to keep the site.

## [Is your site static or a server app?](#static)

This decides how it is published and what it can do. Check what Claude built for you:

| What Claude built | How Embarko treats it | Good to know |
|---|---|---|
| A folder with `index.html` and its CSS, JS and images (or a `public/` folder, or a `Staticfile`) | **[Static site](/docs/capabilities#static-sites).** Published with no build and no server, usually live within seconds | No logs, no environment variables and no `DATA_DIR`. The Free plan lists unlimited static websites ([pricing](/pricing)) |
| A site with a build step, such as Vite or Create React App | **Server app.** Built and run as a server app | It must read its port from `PORT` and listen on `0.0.0.0`. Start it with the production command, not a dev server |
| A site with a Node or Python backend | **Server app, one process** | Keep data in [SQLite under `DATA_DIR`](/docs/capabilities#database). The Free plan lists 1 dynamic app ([pricing](/pricing)) |

## [Before you start: three checks](#checks)

Claude Code can usually fix these itself, but it helps to know them. The [agent quickstart](/docs/agent-quickstart#before) has the same list for your agent.

- **Keep the manifest at the top.** Files like `package.json` or `index.html` must sit at the root of the folder, not in a subfolder.
- **Remove any Dockerfile.** AI tools sometimes add one. Delete it or leave it out of the upload: Embarko builds the app itself and [rejects a Dockerfile](/docs/limitations#build-runtime-customization).
- **Keep secrets out of the folder.** The deploy leaves `.env` files out of the archive, and anything you do include ships with the site. Put secrets in [environment variables](/docs/capabilities#secrets) instead.

### [Also good to know: limits and names](#limits-and-names)

- **Embarko builds it for you.** It [detects](/docs/capabilities#deploy) Node, Python, Go, Ruby, PHP, Rust, Java and plain static sites.
- **Memory.** Each server app gets 256MB, which [cannot be raised](/docs/limitations#compute-isolation), and runs as one process. Dev servers such as `vite dev` or `next dev` are the most common reason an app [runs out of memory](/docs/troubleshoot#oom-killed).
- **Site names.** Lowercase letters, digits and dashes, 3 to 63 characters, not starting or ending with a dash. The name becomes your subdomain and must be unique across all of Embarko. See [app names](/docs/capabilities#identity).
- **Upload size.** If your agent uploads files as JSON (for example from a sandbox that cannot send a file), the limit is 25 MB and 2,000 files. See [deploy limits](/docs/capabilities#deploy).

## [How to host a website built with Claude, step by step](#steps)

### [1. Open the project in Claude Code](#step-1)

Start Claude Code in the folder that holds your site, and make sure the site runs locally. That folder is what gets uploaded.

### [2. Give Claude Code the deploy instructions](#step-2)

**Option A, the skill (faster).** Run this once in your terminal:

```bash
npx skills add embarko-ai/skill --skill embarko-deploy -g
```

This needs Node.js, because the command uses `npx`. The skill packages and deploys for you, and its source is at [embarko.ai/skill](https://github.com/embarko-ai/skill), which opens the public GitHub page for the skill. If `npx` is not found, install Node.js or use Option B, which needs nothing installed.

**Option B, the prompt.** Open [embarko.ai](/), copy the deployment prompt and paste it into Claude Code. It tells the agent how to deploy, so you do not have to learn the API.

Example ask for Claude Code:

```text
Deploy my portfolio to Embarko and share the live link
```

### [3. Let Claude Code do the deploy](#step-3)

It packages the project as a `.tar.gz` (leaving out `node_modules`, `.git` and `.env` files), uploads it to Embarko's deploy API, and [checks the status](/docs/capabilities#status) about every 10 seconds until it reaches `live`. A static site is usually live in the first reply, within seconds. A server app has to build first, so it takes longer.

- **Why "202 Accepted" is not the finish line.** A first response of `202 Accepted` only means the build started. The site is live when the status says `live`. See [202 Accepted is not live](/docs/troubleshoot#202-accepted-misread-as-live-deploy).
- **Claude Code says it cannot reach Embarko?** If you see something like `403 host_not_allowed`, a network sandbox is blocking the upload. Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app` in its network settings, use Claude with the [Embarko connector](/docs/connectors), or ask Claude Code for the deploy commands and run them in your own terminal. Nothing was deployed, so do not wait for a link. See [what to do when the API is unreachable](/docs/agent-playbook#no-connectivity).

### [4. Open your link](#step-4)

When it is live, Claude Code gives you the address, `your-site-name.embarko.app`. Open it and click around to confirm it works. Until you claim it, an HTML page shows a [countdown banner](/docs/troubleshoot#the-in-app-will-be-deleted-banner-doesnt-show-up).

### [5. Claim it within 24 hours](#step-5)

A site deployed without a token is deleted after 24 hours. There is no reminder email, but an unclaimed HTML page shows a countdown banner. To keep it, ask Claude Code to [make it permanent](/docs/agent-playbook#claim). It asks for your email, and Embarko emails you a token. Paste the token back into Claude Code, and it redeploys the same name with it. You can also create a token yourself at [embarko.ai/app/tokens](/app/tokens).

**What success looks like:** Claude Code tells you the site is now permanent, and the link stays the same.

## [Changing the site later](#later)

Ask Claude Code to [redeploy](/docs/capabilities#redeploy) with the same name. Embarko keeps [deployment history](/docs/capabilities#history), and you can [roll back](/docs/agent-playbook#rollback) to a previous successful build. It keeps only the **last 5**, so [older versions may not be available](/docs/limitations#rollback). [Rollback](/docs/capabilities#rollback) restores code, never data, and needs a claimed site.

> **No repo means no safety net.** With no GitHub, Embarko is not where your code lives, and it has [no automatic backups](/docs/capabilities#backups) yet. Its docs recommend you [keep your own source history](/docs/limitations#persistence). You do not need GitHub for that: a local Git repository, a copy in cloud storage, or a regular backup of the folder all work.

**Your own domain.** You can use a domain you already own. Claude Code [adds the domain](/docs/agent-playbook#add-custom-domain) to your site and tells you the exact DNS record, and you create it at your DNS provider. On Cloudflare the record must be DNS-only (grey cloud), and a [subdomain is better than a root domain](/docs/limitations#custom-domains). The [pricing page](/pricing) lists [custom domains](/docs/capabilities#custom-domains) on the Creator plan, and the site must be claimed first.

## [If something goes wrong](#errors)

| What you see | Likely cause | Fix |
|---|---|---|
| [`409 app_name_taken`](/docs/troubleshoot#409-app_name_taken) | Someone already uses that name (it becomes the subdomain) | Pick another name. Do not retry the same one |
| [`422 no_manifest_at_root`](/docs/troubleshoot#422-no_manifest_at_root) | `package.json` (or similar) is in a subfolder | Repackage so it is at the top level |
| [Build exit code 127](/docs/troubleshoot#npm-run-build-did-not-complete-successfully-exit-code-127) | A tool the build calls is missing from your dependencies | Add the tool to `dependencies` or `devDependencies`, then redeploy |
| [`422 app_nested_in_subdirectory`](/docs/troubleshoot#422-app_nested_in_subdirectory) | Your root `package.json` hands the build to a subfolder such as `frontend/` | Deploy that subfolder on its own; the error names it in `deployThisInstead`. One deploy is one app, so a frontend and a backend need two app names |
| [Exit code 137](/docs/troubleshoot#oom-killed) | The app went over 256MB (often a dev server) | Use the production start command and remove anything you do not use. See the [troubleshooting reference](/docs/troubleshoot) |
| [Site gone after a day](/docs/troubleshoot#your-app-disappears-24-hours-after-an-anonymous-deploy) | It was never claimed | Deploy it again, this time with a token, so it is kept. Next time, claim it within 24 hours |
| [`403 host_not_allowed`](/docs/agent-playbook#no-connectivity) | A network sandbox blocks the upload. Nothing was deployed | Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app`, use the Claude connector, or run the deploy commands in your own terminal |

The full list is in the [troubleshooting reference](/docs/troubleshoot).

## [When this is not the right route](#limits)

Embarko is built for small request-and-response sites and apps. The overview explains [when Embarko is the wrong choice](/docs/overview#not-right-when).

**Good fit**

- Portfolios and landing pages
- Marketing sites and blogs
- Forms and internal tools
- MVPs and small AI chat interfaces
- Small games and calculators

**Not a fit**

- WebSockets or realtime connections
- [Scheduled jobs](/docs/capabilities#scheduled-jobs) and [background workers](/docs/capabilities#workers)
- GPU workloads
- Heavy processing such as video and image conversion

Every site is public to anyone with the URL, and there is no [private-site option](/docs/capabilities#access-protection) yet. Embarko is in beta.

## [FAQ](#faq)

### [How do I host a website built with Claude?](#faq-how)

Open the project in Claude Code, install Embarko's [deploy skill](https://github.com/embarko-ai/skill) or paste the deployment prompt from [embarko.ai](/), and ask it to deploy. Claude Code packs the folder, uploads it and gives you a live HTTPS link. No GitHub repository or Vercel account is needed, and the first deploy needs no account of any kind.

### [Can I host a website built in the Claude app instead of Claude Code?](#faq-claude-app)

Yes, with the [Embarko connector](/docs/connectors) for Claude. It deploys from a public `.tar.gz` link, not from a folder on your computer, and the site lands in your account from the start. If your site only exists as code in a chat, Claude Code or the copied deployment prompt is usually easier.

### [Do I need GitHub or Vercel to host a Claude-built site?](#faq-github)

No. Embarko takes the project folder directly, so there is no repo to create and no account to connect. Without a repo, Embarko is not where your code lives, so [keep your own copy](/docs/limitations#persistence): a local Git repository, a copy in cloud storage or a backup of the folder all work.

### [Will my website stay online?](#faq-stay-online)

Not automatically. A site deployed without a token is deleted 24 hours after its first deploy. To keep it, ask Claude Code to [claim it](/docs/agent-playbook#claim): Embarko emails you a token, you paste it back into Claude Code, and the agent redeploys the same app name with it. The link stays the same and the site becomes permanent.

### [Can I host a Claude Artifact?](#faq-artifact)

Only if it works as a normal web app. An artifact that uses `window.storage` is rejected at deploy with a [`422 unsupported_storage_pattern`](/docs/troubleshoot#422-unsupported_storage_pattern) error. Replace it with [SQLite](/docs/capabilities#database), with the database file under the [`DATA_DIR`](/docs/capabilities#file-storage) folder, because only that folder survives a redeploy. That makes it a server app, not a static site.

### [Can I use my own domain?](#faq-domain)

Yes, if you already own one. [Custom domains](/docs/capabilities#custom-domains) are supported, and the [pricing page](/pricing) lists them on the Creator plan. Claude Code [adds the domain](/docs/agent-playbook#add-custom-domain) to your site and tells you the exact DNS record, then you create that record at your DNS provider. On Cloudflare the record must be DNS-only. If it does not start working, see [custom domain troubleshooting](/docs/troubleshoot#custom-domains).

### [What if Claude Code cannot reach Embarko?](#faq-cannot-reach)

An error such as `403 host_not_allowed` means a network sandbox is blocking the upload and nothing was deployed. Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app` in the sandbox's network settings, use the [Claude connector](/docs/connectors), or ask Claude Code for the deploy commands and run them in your own terminal. See [what to do when the API is unreachable](/docs/agent-playbook#no-connectivity).

## [Built something with AI? Ask it to deploy to Embarko.](#deploy)

Install the skill or copy the prompt, and get a live link without creating a repo. [Get the deployment prompt →](/)

**Keep reading:** [Agent quickstart](/docs/agent-quickstart) · [Troubleshooting reference](/docs/troubleshoot) · [Connectors](/docs/connectors) · [Pricing](/pricing)
