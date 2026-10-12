---
title: "Free Hosting for Students: Deploy Your Project Free"
meta_description: "Free hosting for students: put a portfolio, mini project or hackathon demo online for $0. Your AI agent deploys it, no GitHub or Dockerfile. Limits included."
slug: "free-hosting-for-students"
primary_keyword: "free hosting for students"
secondary_keywords: ["free web hosting for students", "free backend hosting for students", "host college project free", "host student project online", "free server for students"]
category: "Guide"
cover: "/assets/guides/free-hosting-for-students.png"
cover_alt: "A student portfolio and a college project deploy for $0 on the Free plan: unlimited static websites and one dynamic app, live at your-app-name.embarko.app."
read_minutes: 7
datePublished: "2026-10-12"
dateModified: "2026-10-12"
last_verified: "2026-10-12"
author: "The Embarko team"
status: "published"
---

# Free hosting for students: put your project online for $0

**Students can host a project for free on Embarko's Free plan, which lists unlimited static websites and one dynamic app.** You build with an AI tool, paste Embarko's deployment prompt into it, and the agent uploads the project and returns a live link at `your-app-name.embarko.app`. No GitHub repo or Dockerfile is needed. Free means 256MB of memory, Embarko branding, no managed database and no custom domain, so [check the limits](#limits) before you start.

## [Key takeaways](#takeaways)

- **The Free plan is $0 a month.** It lists unlimited static websites and 1 dynamic app, and Embarko branding stays on. Prices and limits are from [embarko.ai/pricing](/pricing) and can change.
- **It is the same Free plan for everyone.** The pricing page lists no student verification, and there is no separate student plan.
- **Your AI agent does the deploy.** Paste the deployment prompt from [embarko.ai](/) into the tool that built your project. No repo, no Docker.
- **Claim your project within 24 hours.** A project deployed without a token is [deleted after 24 hours](/docs/troubleshoot#your-app-disappears-24-hours-after-an-anonymous-deploy), so claim it before your demo or submission.
- **It does not fit every project.** No Postgres, MySQL or MongoDB, no WebSockets, no scheduled jobs and no GPU.

## [What can a student host for free?](#fit)

Embarko hosts small request-and-response apps: one process, [256MB of memory](/docs/capabilities#resources). Find your project in this table.

| Your project | Fits? | What to know |
|---|---|---|
| Portfolio or personal website (HTML, CSS, JavaScript) | Yes | Published as [static files](/docs/capabilities#static-sites), usually live in the first reply. Static sites are listed as unlimited on Free. |
| Mini project in Node.js (Express) or Python (Flask, FastAPI) | Yes | The manifest (`package.json`, `requirements.txt` or `pyproject.toml`) must be at the top of the folder. |
| React or Vite project | Yes, as a server app | It needs a build step, so it runs as a [server app](/docs/capabilities#static-sites), not plain files. |
| Project with a small database | Yes, with SQLite | Open a SQLite file under `DATA_DIR`. It survives redeploys but is [not backed up](/docs/limitations#persistence). |
| Project that needs MySQL, Postgres or MongoDB | No | Embarko has [no managed database](/docs/capabilities#database). |
| Chat app or game that needs WebSockets | No | [Not supported](/docs/capabilities#http-endpoints). HTTP polling works. |
| Bot or job that runs on a schedule | No | [Scheduled jobs](/docs/capabilities#scheduled-jobs) and [workers](/docs/capabilities#workers) are not available. |
| Machine learning that needs a GPU or more than 256MB | No | There are no GPUs, and going over 256MB is an [out-of-memory kill](/docs/troubleshoot#oom-killed). |

## [What does the Free plan not give you?](#limits)

State these before you pick a host. They are the real limits, not fine print.

- **No custom domain.** The pricing page lists "Use your own domain" under Creator, not Free. Your address is `your-app-name.embarko.app`.
- **Embarko branding stays on** the Free plan.
- **One dynamic app.** The Free plan lists 1 dynamic app, so plan which project gets that slot.
- **No automatic backups.** Embarko's docs say [persistent data is not backed up](/docs/limitations#persistence). Keep your own copy of the code and any data you care about.
- **Every app is public** to anyone with the URL. There is no [private-app option](/docs/capabilities#access-protection) yet.
- **Embarko is in beta.**

## [Is this a free VPS or a free server?](#vps)

No. Students often search for a free VPS or free server, and those give you a machine to manage. Embarko gives you hosting: you upload an app, Embarko [detects the language and builds it](/docs/capabilities#resources), runs it as one process and serves it over HTTPS. You do not install or patch a server. If you need a machine you can configure, run background workers or open arbitrary ports, Embarko is the wrong tool.

## [How to deploy a student project for free, step by step](#steps)

### [1. Build the project with your AI tool and run it locally](#step-1)

Use the tool you already work in. Open the project folder and make sure it runs on your computer. That folder is what gets uploaded.

### [2. Copy the deployment prompt](#step-2)

Open [embarko.ai](/), copy the deployment prompt and paste it into your AI agent. Then add one line:

```text
I built a project for college, help me get it live on Embarko
```

### [3. Choose how to sign in](#step-3)

The agent may ask. If you use Claude, you can add the [Embarko connector](/docs/connectors), the only one that exists. Otherwise pick **token by email**: give your email and paste the token from your inbox. If you skip this, the project still goes live but is deleted after 24 hours unless you claim it. The [three ways in](/docs/capabilities#agent-auth) explains each option.

### [4. Wait until the status says live](#step-4)

The agent packs the folder, uploads it and checks the status about every 10 seconds. A static site is usually live in the first reply. A server project has to build first. A first reply of `202 Accepted` only means the build started, so wait for `live`. See [202 Accepted is not live](/docs/troubleshoot#202-accepted-misread-as-live-deploy).

If the upload fails with a network error or `403 host_not_allowed`, your tool's sandbox is blocking Embarko and nothing was deployed. Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app`, use the connector if you use Claude, or run the commands in your own terminal. See [what to do when the API is unreachable](/docs/agent-playbook#no-connectivity).

### [5. Claim it and keep a copy](#step-5)

Ask your agent to [make it permanent](/docs/agent-playbook#claim). It asks for your email, you paste the emailed token, and the agent redeploys the same name. The link does not change. Then keep your own copy of the code, for example a local Git repository, because there are no automatic backups.

## [Hosting a hackathon or college project demo](#demo)

Before demo day or submission:

- **Claim the project.** An unclaimed app disappears 24 hours after its first deploy, with no reminder email.
- **Open the live link on another device.** If it loads there, it works for the judges.
- **Add API keys as environment variables,** after claiming: write the value, then apply it. A write alone [does not reach the running app](/docs/troubleshoot#env-var-changes-need-a-redeploy-to-reach-the-running-app). Static sites cannot have environment variables.
- **List it on Showcase if you want it public.** A claimed app can be added to the public Showcase gallery with a tagline and your name. See [listing on Showcase](/docs/capabilities#showcase). If your event has its own Showcase page, the organiser approves the listing. [Hackathon organisers](/hackathons) can apply for an event page.

## [If something goes wrong](#errors)

| What you see | Likely cause | Fix |
|---|---|---|
| A network error, or [`403 host_not_allowed`](/docs/agent-playbook#no-connectivity) | Your tool's sandbox blocks Embarko. Nothing was deployed. | Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app`, or run the commands yourself. |
| [Exit code 137](/docs/troubleshoot#oom-killed) | The project went over 256MB, often a dev server | Use the production start command. |
| [`422 no_manifest_at_root`](/docs/troubleshoot#422-no_manifest_at_root) | The manifest is in a subfolder | Repackage so it is at the top of the archive. |
| [`409 app_name_taken`](/docs/troubleshoot#409-app_name_taken) | Another company owns that name | Pick a different name. Do not retry it. |
| [Project gone after a day](/docs/troubleshoot#your-app-disappears-24-hours-after-an-anonymous-deploy) | It was never claimed | Deploy it again with a token so it is kept. |

Other codes are in the [troubleshooting reference](/docs/troubleshoot#quick-lookup-by-code).

## [FAQ](#faq)

### [Is Embarko really free for students?](#faq-free)

Yes, within the Free plan: $0 a month for unlimited static websites and 1 dynamic app, with Embarko branding. Paid plans exist (Creator is $9/month billed yearly, Team $23/month billed yearly), and all prices can change, so check [embarko.ai/pricing](/pricing).

### [Do I need to prove I am a student?](#faq-proof)

The pricing page lists no student verification for the Free plan. It is the same plan for everyone, not a student programme.

### [Can I host a college project that uses MySQL or MongoDB?](#faq-database)

Not on Embarko. It has [no managed database](/docs/capabilities#database). A project with a small amount of data can use SQLite under `DATA_DIR`. A project that needs MySQL, Postgres or MongoDB should stay where its database lives.

### [Can I use my own domain on the Free plan?](#faq-domain)

No. The pricing page lists your own domain under Creator. On Free your address is `your-app-name.embarko.app`.

### [Will my project stay online after the demo?](#faq-stay-online)

Only if you claim it. An app deployed without a token is deleted 24 hours after its first deploy. After you [claim it](/docs/agent-playbook#claim), the link stays the same. Keep your own copy of the code, because Embarko has [no automatic backups](/docs/capabilities#backups).

### [Is there a free VPS for students?](#faq-vps)

Embarko is not a VPS. It hosts apps and runs each one as a single process with 256MB of memory. If you need a machine you can configure yourself, you need a different kind of service.

## [Built something with AI? Ask it to deploy to Embarko.](#deploy)

Copy the prompt, paste it into your agent and get a live link for your project without creating a repo. [Get the deployment prompt →](/)

**Keep reading:** [Agent quickstart](/docs/agent-quickstart) · [Troubleshooting reference](/docs/troubleshoot) · [Hackathons](/hackathons) · [Pricing](/pricing)
