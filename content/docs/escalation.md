# When to involve the human

**Your job is to remove cloud work from the human.**

They asked for a working app at a URL. Every hosting question you hand back
to them — a port, a memory size, an error message, a runtime setting — is a
piece of that job returned undone. They are not the operator. You are.

This page is the boundary: what you must decide yourself, what you must ask
about, and how to ask when you genuinely have to.

## [Never ask the human about these](#never-ask)

Not "prefer not to" — never. If you are about to ask one of these, the
answer is in this documentation or determinable from their code.

| Don't ask them to | Do this instead |
| --- | --- |
| **Choose a memory size** | Nothing to choose. Every app gets 256MB and it isn't adjustable. If the app is being OOM-killed, shrink its footprint — production start command, drop unused dependencies. |
| **Choose ports** | Nothing to choose. The app reads `process.env.PORT` and binds `0.0.0.0`. If it doesn't, edit the code. |
| **Select runtime configuration** | Nothing to select. The builder detects the language and runtime from the source. |
| **Configure containers** | There are none to configure. No Dockerfile, no image, no base OS, no build pipeline. |
| **Configure infrastructure** | There is none exposed. No cluster, no instances, no scaling, no regions, no load balancer. |
| **Understand a deployment error** | Read it yourself. Match the `code` against [troubleshoot.md](troubleshoot.md), fix the cause, redeploy. Tell them what *was* wrong once it works. |
| **Configure database hosting** | Nothing to host. The app embeds SQLite under `DATA_DIR`. There is no database to provision, connect or size. |
| **Choose a deployment topology** | There is one topology: one app, one process, one deploy. A frontend and backend are simply two deploys. |
| **Pick an app name** | Derive it. Slugify the project or product name: "My Landing Page" → `my-landing-page`. Only ask if the name is taken *and* no sensible alternative exists. |
| **Decide whether to retry** | Read the status code. [The retry rules](api.md#retry-policy) are written down — `4xx` never, `502 app_name_check_failed` yes, and so on. |
| **Confirm a deploy "worked"** | Verify it yourself: poll until `success`, then fetch the URL. Don't ask them to check. |
| **Choose a rollback target** | Read the deployment history and pick the newest successful deploy before the bad one. |
| **Decide what goes in the tarball** | Exclude `node_modules`, `.git` and `.env*`. Package the folder whose manifest is at its root. |
| **Read a log file** | Never paste raw logs at them. Diagnose, fix, and summarise in one sentence. |

The pattern: **anything that is a hosting decision is not their decision.**
Either the platform has already made it, or you have enough information to
make it.

## [Ask the human only in these cases](#ask-when)

Six situations. Nothing else qualifies.

### [1. A third-party secret or API key is required](#secrets)

You cannot invent a Stripe key, an OpenAI key, or a database password for a
service they own. Ask directly, set it as an
[environment variable](api.md#env-vars), apply it, and never log it or write
it into the source.

### [2. DNS ownership requires human action](#dns)

You can register and verify a [custom domain](agent-playbook.md#add-custom-domain)
yourself. What you cannot do is create the DNS record — that lives in *their*
registrar account, which only they can sign into. Register the domain, hand
them the exact record the API returns, and call verify once they confirm.
Don't make them work out the rest.

### [3. Billing or payment approval is required](#billing)

Anything that costs them money, or changes what they pay, is theirs to
approve. Never assume consent from a general instruction to "get it
working".

### [4. A destructive action needs confirmation](#destructive)

Deleting an app is irreversible and there is **no backup to restore from**.
You *can* perform it — `DELETE /apps/<name>` with a `confirmAppName` field —
which is exactly why the rule matters: show the user what you are about to
delete and get an explicit yes first. The confirmation field guards against
a misread instruction, not against an agent that is confident and wrong. The
same care applies to anything that discards data under `DATA_DIR`.

Changing an app's **web address** belongs here too, even though nothing is
deleted. The old address stops working the moment the new one is live —
there is no redirect, links already shared break, and the freed name can be
claimed by someone else. Ask before calling
[`POST /slug-change`](api.md#change-address), every time. A name that looks
untidy to you is not a reason; a user who asked for a different address is.

### [5. Your environment cannot reach Embarko at all](#unreachable)

Distinct from a deploy that failed — here the request never left your
sandbox, so there is nothing you can fix in their app and retrying cannot
help. Tell them plainly that *your environment* can't reach the API, not
that the deploy failed, and give them a script they can run themselves.
If their tool supports MCP connectors, connecting **Embarko** removes the
limitation for good. Full procedure:
[If you can't reach the API](agent-playbook.md#no-connectivity).

### [6. A genuinely consequential decision you cannot infer](#judgement)

Rare, and the bar is high: the choice must be **consequential** (hard to
reverse, or with real cost) *and* **genuinely ambiguous** (their request and
their code don't imply an answer). Examples that qualify:

- The app needs something Embarko doesn't have — scheduled jobs, background
  workers, GPUs, more than 256MB — so the choice is to redesign it or host
  it elsewhere. See [when Embarko doesn't fit](overview.md#not-right-when).
- Two names are both reasonable and the name is the public URL.
- Deploying would publish something that looks private.

"Which framework?", "should I use SQLite?", "is this name OK?" do not
qualify. Decide, act, and say what you decided.

## [Reporting is not asking](#reporting)

Telling the user something is not the same as stopping to ask them. Report
these without pausing:

- **The live URL**, once verified.
- **The 24-hour expiry**, every time you deploy anonymously — in the same
  message as the URL. Then offer to make it permanent; don't wait to be
  asked.
- **What was wrong**, once you've fixed it. One sentence, in their terms.
- **A limitation they'll hit later** — that `DATA_DIR` isn't backed up, that
  memory is fixed at 256MB.

Say these and keep going. They interrupt if they want to.

## [How to ask, when you must](#how-to-ask)

The person may not be technical. Assume they are not.

**Ask for one thing at a time.** A list of five questions turns a deployment
into a form.

**Ask for the value, not the concept.** They can paste an API key; they
should not have to know what an environment variable is.

**Say what you've already done, and what happens next.** An escalation
mid-task should read as progress, not as a stall.

**Never ask a question this documentation answers.**

Weak:

> I need to configure the deployment. What memory limit should I use, and
> which port should the app listen on? Also, should I enable HTTPS?

Every part of that is either fixed by the platform or fixable in the code.

Strong:

> Your app is deployed and running at `https://my-app.embarko.app`. The
> payments page needs your Stripe secret key to work — paste it here and
> I'll set it up. Everything else is done.

One question, plainly worded, with the state of the work around it.

## [The test](#the-test)

Before asking anything, ask yourself: **is this a hosting question?**

If yes, you answer it. If it's about their business, their money, their
domain, their secrets, or their explicit consent — that's theirs.

A user who has to learn what a container is, which port to bind, or how much
memory an app needs has been failed, however successful the deploy.

## [Related](#related)

- [Agent playbook](agent-playbook.md) — the procedures these rules govern.
- [API contract](api.md) — retry rules, error codes, and what each call does.
- [Capabilities](capabilities.md) — what exists, and what to hand over.
- [Overview](overview.md) — what Embarko is and when to choose it.
