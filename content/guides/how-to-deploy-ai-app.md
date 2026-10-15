---
title: "How to Deploy an AI App: From Idea to Live Link"
meta_description: "Built an app with AI? Learn how to deploy it: copy one prompt, paste it into Claude, Cursor or Antigravity and share a live link. No coding, no GitHub."
slug: "how-to-deploy-ai-app"
primary_keyword: "how to deploy ai app"
secondary_keywords: ["what does localhost mean", "what does it mean to deploy an app", "deploy app built with ai", "deploy without github", "where to put api key when deploying"]
category: "Guide"
cover: "/assets/guides/how-to-deploy-ai-app.png"
cover_alt: "An AI tool chat where Embarko's prompt has been pasted and the reply says the app is live, with an arrow to the finished app open at your-app-name.embarko.app."
read_minutes: 6
datePublished: "2026-10-07"
dateModified: "2026-10-14"
last_verified: "2026-10-14"
author: "The Embarko team"
status: "published"
---

# How to Deploy an AI App: From Idea to Live Link

Your app works on your laptop. Now you want to send someone a link. Here's what's going on, what your options are, and the quickest way to get there.

**To deploy an AI-built app, you move it from your own computer to a server that stays online, which gives it a public web address.** The quickest way is to let your AI tool do the move for you. With Embarko, you copy one prompt from [embarko.ai](/), paste it into the tool you built your app in, and it hands you a link like `your-app-name.embarko.app`. No GitHub, no Docker, no hosting course.

## [Key takeaways](#takeaways)

- An AI-built app runs on **localhost**, which only your own computer can open.
- **Deploying** means putting it on a server with a public address.
- The usual route needs a GitHub repo, a hosting account, build settings and secret keys.
- With Embarko, your AI tool does the upload from **one prompt**, and you get a live link.

## [The whole journey, from idea to live link](#journey)

Every AI-built app follows the same four stages. The first two are your AI tool's job. The third is where you need a host.

1. **Describe it.** You tell your AI tool what you want, in plain words.
2. **Try it.** The tool builds it and runs it on your computer, so you can click around.
3. **Put it online.** This is the stage where projects get stuck. It's what the rest of this guide is about.
4. **Share it.** You send the link, get feedback and keep improving the app.

## [Why your AI-built app only works on your computer](#why)

When Claude, Cursor or another AI tool builds your app, it runs it on your own machine so you can try it. If you look at the address bar, you'll often see something like `localhost:3000`.

"Localhost" is simply the name for "this computer." A link that starts with it only means something on the machine that made it. Send it to a friend and it points at their computer, where your app doesn't exist.

- **On your computer:** `localhost:3000`. Only you can open it. It stops when you close your laptop.
- **On the internet:** `your-app-name.embarko.app`. Anyone with the link can open it, any time.

## [What "deploying" actually means](#what)

Deploying sounds technical, but it's three simple things, and you only ever need to think about them once:

1. **A computer that stays on.** Called a server. It sits in a data center and never goes to sleep, so your app is always reachable.
2. **Your app's files on it.** Your project gets packed up and copied there. This is the "upload" part.
3. **A public address.** A link anyone can type or tap. Hosting companies give you one for free or by default.

That whole bundle is called hosting. The only real question is how you get your app from your computer onto a host. There are a few ways.

## [Why deploying is the part where people get stuck](#hard)

Building the app with AI took an afternoon. Putting it online is a different kind of work. The usual route asks you to learn things you never planned to:

- **Make a GitHub account and a repository.** Then learn enough Git to push your code there, and keep it in sync every time you change something.
- **Pick a hosting service and sign up.** Vercel, Netlify, DigitalOcean and others all work differently, and each has its own dashboard and vocabulary.
- **Tell it how to build and start your app.** That means build commands, start commands, a framework preset, and sometimes a Dockerfile you didn't ask for.
- **Get the port and the address right.** An app that listens on `localhost:3000` builds fine and then shows nothing online, and the error doesn't tell you why.
- **Handle secret keys.** Your ChatGPT, Gemini or Claude key must live in "[environment variables](/docs/env-vars)" on the host, never in the code, or it can leak.
- **Read the build logs when it fails.** They're written for developers, and one small error can stop the whole deploy.

None of this is hard for a developer. For everyone else, it can be a lot to take in, and the thing you built stays on your laptop until it's done.

## [Three ways to deploy an AI-built app](#routes)

### [1. A Git repository and a host](#route-git)

Push your code to GitHub and connect it to Vercel, Netlify or DigitalOcean. Best for projects you keep changing or share with a team.

### [2. The command line](#route-cli)

Pack and upload the project yourself. Best if you like working in a terminal.

### [3. Your AI tool](#route-ai)

Your tool packs, uploads and checks the app. With Embarko, that's one prompt. Best for a first deploy or a quick share.

## [The Embarko way: one prompt instead of all of that](#ways)

Embarko is hosting that your AI tool runs for you. The tool that built your app also packs it, uploads it and checks that it's live, so you skip most of the steps in that list.

| The usual route | With Embarko |
| --- | --- |
| Create a GitHub account and push a repository | No repository. Your tool [uploads the project folder directly](/guides/deploy-app-without-github). |
| Sign up and learn a hosting dashboard | Your [first link](/docs/claim) doesn't need an account. |
| Set build commands and write a Dockerfile | No Dockerfile. [Embarko builds the app itself](/docs/deploy). |
| Watch the build and decode the logs | Your tool checks that it's live and sends you the link. |
| Learn the hosting terms first | Paste one prompt, then approve and keep. |

For a long-running project with a team, Git-based hosting is a good fit. For getting something you just built in front of people, one prompt is hard to beat.

## [What you can deploy with Embarko](#fit)

Embarko suits small web apps. Here's how common AI-built apps line up, and what to do if yours needs something else.

| What your AI built | Fits? | What to know |
| --- | --- | --- |
| A plain website | Yes | Keep `index.html` at the top of the folder. |
| A Node.js app | Yes | `package.json` at the top. Read the port from `PORT` and listen on `0.0.0.0`. |
| A Python app | Yes | `requirements.txt` or `pyproject.toml` at the top. |
| A React or Vite app | Yes | Built first, then run as a server app. |
| A small database | Yes, SQLite | Save the SQLite file under `DATA_DIR`, the folder that [survives redeploys](/docs/data). Keep your own copy of important data. |
| A frontend and a backend in one project | Two apps | Deploy each folder as its own app. If you see `422 app_nested_in_subdirectory`, deploy the folder it names. |
| A Claude artifact that uses `window.storage` | Swap it | Replace `window.storage` with SQLite under `DATA_DIR`. |
| Postgres or MySQL | Another route | Use SQLite for small data, or host that app where its database lives. |
| Live updates (WebSockets) | Another route | Use regular HTTP polling instead. |
| Scheduled jobs | Another route | Run them elsewhere and have them call your app. |
| Your own AI model | Another route | Host the model elsewhere and let your app call it. Apps that call ChatGPT, Gemini or Claude are fine. |

Not sure which one you have? Ask your AI tool: "Does this app use a database, live updates or scheduled jobs?"

## [Deploy with one prompt](#deploy)

**Before you start**

- Your app's folder is open in your AI tool.
- The tool can run commands and reach the internet. It asks before it does.
- An email address, only if you pick email sign-in.

**1. Grab the prompt.** Go to [embarko.ai](/) and tap **Host your app** on the home page (it's called **Copy deployment prompt** on the [pricing page](/pricing)). The prompt is a ready-made message that tells your AI tool how to put your app online. You don't write it, you just copy it.

**2. Hand it to your tool.** The steps work in Claude, Cursor, Antigravity, Codex, Replit, Lovable, Bolt, v0, ChatGPT or Gemini. Where did you build your app? Find it below.

### [Built in Claude](#tool-claude)

1. Paste the prompt into Claude and press Enter.
2. Claude uploads your app and checks that it's live.
3. It sends you a link. Open it.

**You'll know it worked** when your app opens at `your-app-name.embarko.app`. Tip: add Embarko's [skill](https://embarko.ai/skill) once, and Claude will know how to deploy whenever you ask.

### [Built in Cursor](#tool-cursor)

1. Paste the prompt into Cursor's chat.
2. If Cursor asks to run a command, tap Allow.
3. Cursor gives you the link. Open it.

**You'll know it worked** when your app opens at your link.

### [Built in Antigravity](#tool-antigravity)

1. Paste the prompt into Antigravity's agent chat.
2. When it asks permission to run the upload, read the command and approve it.
3. The agent gives you the link. Open it.

**You'll know it worked** when your app opens at your link.

### [Built in Codex](#tool-codex)

1. Paste the prompt into Codex.
2. If it asks to run a command, approve it.
3. Codex gives you the link. Open it.

**You'll know it worked** when your app opens at your link.

### [Built in Replit](#tool-replit)

Replit apps need one extra step first: getting your files out.

1. In Replit, tap the three-dot menu at the top of the file tree and choose **Download as zip**.
2. Unzip it and open the folder in Claude or Cursor.
3. Paste the prompt there. The tool gives you the link.

**You'll know it worked** when your app opens at your link.

### [Built in Lovable, Bolt or v0](#tool-browser)

These tools run in your browser, so you'll move your project into a tool on your computer first.

1. Export or download your project.
2. Open it in Claude or Cursor.
3. Paste the prompt there. The tool gives you the link.

**You'll know it worked** when your app opens at your link.

### [Only have code from ChatGPT or Gemini](#tool-chat)

No problem. Chat code just needs a home on your computer first.

1. Save the code into a folder on your computer.
2. Open that folder in Claude or Cursor.
3. Paste the prompt there. The tool gives you the link.

**You'll know it worked** when your app opens at your link.

**3. Your tool does the work.** It packs your project (leaving out `node_modules`, `.git` and `.env` files), uploads it, checks about every 10 seconds until the app is live, then hands you the link.

**4. Approve what it asks.** You allow the upload command (read it first), choose email sign-in and paste the token Embarko sends you, then open the "keep this app" link at the end.

**5. Confirm it worked.** Your tool reports that the app is live and gives you a link ending in `.embarko.app`. Open it, click the main pages, and try any form or button that talks to a server. A first reply of "202 Accepted" only means the build has started.

**6. Keep it.** A link made without signing in lasts 24 hours, with no reminder email, so press **Keep** on the "[keep this app](/docs/claim)" link your tool shares (or tell it "Make my Embarko app permanent") and it stays at the same address. After you press Keep, Embarko gives you a prompt that carries your token. Paste it into your tool once, and "Update my Embarko app." works from then on.

## [If something goes wrong](#fix)

Most failed deploys come from three things:

1. **Addresses that only work on your computer.** Code that calls `localhost` from the browser fails for every visitor.
2. **Missing settings.** Keys in a `.env` file on your laptop don't exist on the host until you add them.
3. **The wrong port.** Hosts choose the port, so an app fixed to 3000 or to localhost shows nothing online.

| What you see | Likely cause | Fix |
| --- | --- | --- |
| Network error or `403 host_not_allowed` | Your tool is blocking the upload. | Allow `embarko.ai`, `ship.embarko.ai` and `*.embarko.app`, or run a script in your own terminal. |
| "202 Accepted", no link yet | The build is still running. | Wait for the status to say `live`. |
| `422 no_manifest_at_root` | Your app file isn't at the top. | Move `package.json`, `requirements.txt`, `pyproject.toml` or `index.html` to the top. |
| Exit code 137 | Over 256 MB, often a dev server. | Use the production start command. |
| `409 app_name_taken` | The name is in use. | Pick another name. |
| `422 app_nested_in_subdirectory` | The build is handed to a subfolder. | Deploy the folder named in the reply. A frontend and a backend are two apps. |
| A feature fails | A key or setting is missing. | After Keep, add it as a secret and apply it. Plain websites keep settings in their files. |
| The link doesn't open, or the status says failed or crashed | Wrong port or localhost only. | Use the prompt below. |

> Make my app read its port from the PORT environment variable and listen on 0.0.0.0, then redeploy.

Every code is explained in the [troubleshooting reference](/docs/errors).

## [After it's live](#after)

To change something, ask your tool: "Update my Embarko app."

To add an AI key, never put it in your project files. Once you've pressed Keep, ask: "Add my AI key to my Embarko app as a secret."

Plain websites can't use secrets, so keep their settings in the site's files. A custom domain is listed under the paid Creator plan (see [pricing](/pricing)). You'll need to own the domain, and your tool tells you the one DNS record to add. Then share your link with anyone.

## [FAQ](#faq)

### [What does localhost mean?](#faq-localhost)

Localhost is the name for "this computer." A link that starts with localhost, like `localhost:3000`, only works on the machine running the app. To let other people open your app, it has to be deployed to a server with a public address.

### [What does it mean to deploy an app?](#faq-deploy-meaning)

Deploying means moving your app from your own computer to a server that stays online, so it gets a public address anyone can open. The server, your app's files on it and the address together are called hosting.

### [How do I deploy an AI app?](#faq-how)

Copy Embarko's prompt from embarko.ai and paste it into the AI tool you built your app in, such as Claude, Cursor or Antigravity. The tool uploads your app and gives you a live link. Press Keep so the link stays permanent.

### [Do I need to know how to code?](#faq-code)

No. Your AI tool does the technical work. You copy one prompt, paste it, answer a question or two, and approve a command if your tool asks. Nothing needs to be installed.

### [Do I need GitHub?](#faq-github)

No. With Embarko your AI tool [uploads the project folder directly](/guides/deploy-app-without-github), so there is no repository to create or connect and no Dockerfile to write.

### [Is it free?](#faq-free)

There is a Free plan: $0 a month for unlimited simple websites and 1 app that runs code behind the scenes, with Embarko branding. Using your own domain is listed under the paid Creator plan. Prices are from [embarko.ai/pricing](/pricing) and can change.

### [Where do I put my AI key?](#faq-api-key)

Not in your project files. Once you've pressed Keep, ask your AI tool to add the key to your Embarko app as a [secret](/docs/env-vars) and apply it. Embarko keeps it encrypted and nobody can read it back, so keep your own copy of the key. Plain websites can't use secrets, so keep their settings in the site's files.

### [What kinds of apps can I deploy to Embarko?](#faq-kinds)

Plain websites, Node.js apps such as Express, Python apps such as Flask or FastAPI, and React or Vite apps with a build step. Chat apps that call ChatGPT, Gemini or Claude are a normal fit. A frontend and a backend are two apps, so deploy each folder on its own. Apps that need a managed Postgres or MySQL database, live WebSocket updates, scheduled jobs, or your own AI model need another route for that part.

### [How do I know my app deployed successfully?](#faq-success)

Your tool reports that the app is live and gives you a link ending in `.embarko.app`. Open it, click through the main pages and try anything that talks to a server, such as a form or a button. A first reply of 202 Accepted only means the build has started.

### [Which AI tools can I deploy from?](#faq-tools)

You can deploy from Claude, Cursor, Antigravity or Codex by pasting the prompt into the tool. Apps from Replit, Lovable, Bolt or v0, and code from ChatGPT or Gemini, work too: export or save the project, open it in Claude or Cursor, and paste the prompt there.

### [Is it safe to put an AI-built app online?](#faq-safe)

Keep secret keys, such as a ChatGPT, Gemini or Claude key, out of your project files. Once you've pressed Keep, ask your AI tool to add the key to your Embarko app as a secret instead. Also remember that anyone with your link can open your app, so if it uses your AI key, set a spending limit with your AI provider if they offer one.

### [How do I update my app later?](#faq-update)

Ask your AI tool: "Update my Embarko app." It [uploads the new version](/docs/deploy) to the same link. After you press Keep, Embarko gives you a prompt that carries your token. Paste it into your tool once, and updates work from then on.

## [Ready to get your app a link?](#next)

Copy the prompt, paste it into your AI tool and share what you built.

**Keep reading:** [Agent quickstart](/docs/quickstart): the steps your AI tool follows to deploy. · [Troubleshooting reference](/docs/errors): every error code, explained. · [Pricing](/pricing): what each plan includes.
