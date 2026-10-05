# When to involve the human

**Your job is to remove cloud work from the human.**

They asked for a working app at a URL. They are not the operator. You are. Every hosting question you hand back (a port, a memory size, an error message, a runtime setting) is part of that job left undone.

| Situation | What you do |
|---|---|
| A hosting decision | [Decide it yourself](#never-ask). Never ask. |
| One of seven listed cases | [Ask, one question at a time](#ask-when) |
| News they should hear | [Tell them and keep going](#reporting) |

## [What should I never ask the human?](#never-ask)

Never ask about these. If you are about to, the answer is in these docs or in their code.

| Don't ask them to | Do this instead |
| --- | --- |
| **Choose a memory size** | Nothing to choose. Every app gets 256MB and it can't be changed. If the app is OOM-killed, shrink it: production start command, drop unused dependencies. |
| **Choose ports** | Nothing to choose. The app reads `process.env.PORT` and binds `0.0.0.0`. If it doesn't, edit the code. |
| **Select runtime configuration** | Nothing to select. The builder detects the language and runtime from the source. |
| **Configure containers** | None to configure. No Dockerfile, no image, no base OS, no build pipeline. |
| **Configure infrastructure** | None is exposed. No cluster, no instances, no scaling, no regions, no load balancer. |
| **Understand a deployment error** | Read it yourself. Match the `code` in [troubleshoot.md](troubleshoot.md), fix the cause, redeploy. Tell them what *was* wrong once it works. |
| **Configure database hosting** | Nothing to host. The app embeds SQLite under `DATA_DIR`. No database to provision, connect or size. |
| **Choose a deployment topology** | There is one: one app, one process, one deploy. A frontend and a backend are two deploys. |
| **Pick an app name** | Derive it. Slugify the project or product name: "My Landing Page" → `my-landing-page`. Ask only if the name is taken *and* no sensible alternative exists. |
| **Decide whether to retry** | Read the status code. [The retry rules](api.md#retry-policy) are written down: `4xx` never, `502 app_name_check_failed` yes, and so on. |
| **Confirm a deploy "worked"** | Check it yourself: poll until `success`, then fetch the URL. Don't ask them to check. |
| **Choose a rollback target** | Read the deployment history. Pick the newest successful deploy before the bad one. |
| **Decide what goes in the tarball** | Leave out `node_modules`, `.git` and `.env*`. Package the folder that has the manifest at its root. |
| **Read a log file** | Never paste raw logs at them. Diagnose, fix, and sum up in one sentence. |

The rule: **a hosting decision is never theirs.** The platform has already made it, or you have enough to make it.

## [When must I ask the human?](#ask-when)

Only in these seven cases. Nothing else counts.

### [1. A third-party secret or API key is required](#secrets)

You can't invent a Stripe key, an OpenAI key, or a password for a service they own.

1. Ask for it directly.
2. Set it as an [environment variable](api.md#env-vars).
3. Apply it.
4. Never log it or write it into the source.

### [2. DNS ownership requires human action](#dns)

You can register and verify a [custom domain](agent-playbook.md#add-custom-domain) yourself. You can't create the DNS record. It lives in *their* registrar account, which only they can sign into.

1. Register the domain.
2. Give them the exact record the API returns.
3. Call verify once they confirm.

Don't make them work out the rest.

### [3. Billing or payment approval is required](#billing)

Anything that costs them money, or changes what they pay, is theirs to approve. A general "get it working" is not consent.

### [4. A destructive action needs confirmation](#destructive)

**Deleting an app.** It can't be undone and there is **no backup to restore from**. You *can* do it with `DELETE /api/apps/<name>` and a `confirmAppName` field. That is why the rule matters: show the user what you will delete and get an explicit yes first. The confirmation field catches a misread instruction. It does not stop an agent that is confident and wrong. Take the same care with anything that discards data under `DATA_DIR`.

**Changing an app's web address.** Nothing is deleted, but:

- the old address stops working the moment the new one is live
- there is no redirect, so links already shared break
- someone else can claim the freed name

Ask before calling [`POST /slug-change`](api.md#change-address), every time. A name that looks untidy to you is not a reason. A user asking for a different address is.

### [5. Your environment cannot reach Embarko at all](#unreachable)

This is not a failed deploy. The request never left your sandbox, so there is nothing to fix in their app and retrying won't help.

1. Tell them plainly that *your environment* can't reach the API. Don't say the deploy failed.
2. Give them a script they can run themselves.
3. If their tool supports MCP connectors, connecting **Embarko** fixes this for good. The link for each tool is on [Connectors](connectors.md).

Full procedure: [If you can't reach the API](agent-playbook.md#no-connectivity).

### [6. A consequential decision you cannot infer](#judgement)

Rare. The choice must be both:

- **consequential**: hard to undo, or with real cost, and
- **truly ambiguous**: their request and their code don't point to an answer.

Examples that count:

- The app needs something Embarko doesn't have (scheduled jobs, background workers, GPUs, more than 256MB), so the choice is to redesign it or host it elsewhere. See [when Embarko doesn't fit](overview.md#not-right-when).
- Two names are both reasonable and the name is the public URL.
- Deploying would publish something that looks private.

"Which framework?", "should I use SQLite?" and "is this name OK?" don't count. Decide, act, and say what you decided.

### [7. You have no connector and no token](#access)

Ask once, at the start, before the first deploy. Offer these choices in one message:

1. Add the Embarko connector to their AI tool ([Connectors](connectors.md)).
2. Get a token by email: ask for their email, then request it once.
3. Create a token at [embarko.ai/app/tokens](https://embarko.ai/app/tokens) and paste it.
4. Skip: deploy anonymously. The app is deleted after 24 hours unless it's kept.

Full steps: [Get access](agent-quickstart.md#connector).

## [What should I tell them without stopping?](#reporting)

Telling is not asking. Report these and keep working:

- **The live URL**, once checked.
- **The 24-hour expiry**, every time you deploy anonymously, in the same message as the URL. Then offer to make it permanent. Don't wait to be asked.
- **What was wrong**, once fixed. One sentence, in their words.
- **A limit they'll hit later**, such as `DATA_DIR` having no backup, or memory being fixed at 256MB.

They'll interrupt if they want to.

## [How do I ask, when I must?](#how-to-ask)

Assume the person is not technical.

1. **Ask for one thing at a time.** Five questions at once turns a deploy into a form.
2. **Ask for the value, not the concept.** They can paste an API key. They shouldn't need to know what an environment variable is.
3. **Say what you've done and what comes next.** A mid-task question should read as progress, not a stall.
4. **Never ask what these docs answer.**

Weak:

> I need to configure the deployment. What memory limit should I use, and
> which port should the app listen on? Also, should I enable HTTPS?

Every part of that is fixed by the platform or fixable in the code.

Strong:

> Your app is deployed and running at `https://my-app.embarko.app`. The
> payments page needs your Stripe secret key to work. Paste it here and
> I'll set it up. Everything else is done.

One plain question, with the state of the work around it.

## [How do I decide in one step?](#the-test)

Before asking anything, ask yourself: **is this a hosting question?**

- If yes, you answer it.
- If it's about their business, money, domain, secrets, or explicit consent, it's theirs.

A user who has to learn what a container is, which port to bind, or how much memory an app needs has been failed, however well the deploy went.

## [Related](#related)

- [Agent playbook](agent-playbook.md): the procedures these rules govern.
- [API contract](api.md): retry rules, error codes, and what each call does.
- [Capabilities](capabilities.md): what exists, and what to hand over.
- [Overview](overview.md): what Embarko is and when to choose it.
