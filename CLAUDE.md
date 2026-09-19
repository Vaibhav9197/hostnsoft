# Embarko Panel — UX Redesign Instructions

## Core principle

Embarko is not an app builder. The user's AI agent builds the app. Embarko only
hosts, deploys, and keeps it running.

The panel should therefore feel like:

> "Here are my apps. Are they live? Is anything wrong?"

Not like a traditional hosting dashboard.

## 1. Home screen

Rename **Apps** → **Your apps**. Remove unnecessary description text.

Each app card should show only:

- App name
- Live URL
- Clear status: Live / Not online / Needs attention
- Last updated
- Primary action: **Open app**

Do not show technical data like memory unless it matters. Do not show redundant
dates.

## 2. Replace "New app"

Do not use **New app** — Embarko does not create apps. Use **Deploy an app**.

Clicking it should open a very simple flow:

```
Deploy an app

[ Copy Embarko prompt ]

1. Copy
2. Paste into your AI agent
3. Ask it to deploy
```

No forms. No app name field. No upload UI. The app should appear automatically
after the AI deploys it.

## 3. Remove technical deploy prompt from normal UX

Never show users:

- API URLs
- curl
- bearer tokens
- multipart fields
- headers
- internal API instructions

The normal user should only see **Copy Embarko prompt**. Technical instructions
belong inside the prompt/skill or developer docs.

## 4. Remove "Get deploy token" from global header

Do not make tokens part of normal navigation. Long term this becomes
**Connect AI**.

Until the new OAuth/pairing flow is ready, raw tokens should live under
**Settings → Developer → API keys**.

## 5. App detail page

The current navigation — Overview, Deployments, Domain, Environment, Settings —
is too traditional SaaS. The default screen should instead focus on the app
itself:

```
My app
● Live
myapp.app.embarko.ai

[ Open app ]
```

Then:

```
Latest activity
Deployed successfully — 12 minutes ago
App is running normally
```

Everything technical should be secondary.

## 6. Progressive disclosure

Domain, environment, deployment history, logs, settings, etc. can exist. But
they should appear only when needed. Do not give every technical feature equal
visual weight.

Primary experience: **App → Status → Result → Next action**

## 7. State must be extremely clear

Never show conflicting states like **Not deployed** and **Open live URL** at the
same time.

Use only clear states:

| State | Action |
| --- | --- |
| Live | Open app |
| Not online | Deploy with your AI |
| Needs attention | Latest deployment failed — See what happened |

## 8. Push work back to the AI

Embarko should not slowly turn the user into a hosting engineer. Where possible:

- Deployment failed → **Fix with your AI**
- Update available → **Ask AI to redeploy**
- Need configuration → provide something the user can send directly to their AI

The AI does the work. The panel explains state.

## 9. Home should feel like a place where apps live

Keep the subtle sky/cloud visual direction, but do not make it wallpaper behind
cards. Use the space to create an Embarko world. As users deploy more apps, the
space fills with them. Apps should feel like objects living in the environment.

Calm. Minimal. Premium.

Avoid:

- heavy dashboards
- grids everywhere
- server visuals
- technical diagrams
- dark developer-tool styling

## 10. Empty state

If there are no apps:

```
Your apps will appear here.

[ Copy Embarko prompt ]

1. Paste into your AI
2. Ask it to deploy
3. Your app appears here
```

The empty state should immediately start the job.

## 11. Global navigation

Keep it extremely small. Ideally just:

- Your apps
- Account

That's enough initially. Inside **Account**:

- Plan
- Billing
- Connected AI
- Developer/API keys
- Team if needed

Do not create navigation just because hosting products usually have many
modules.

## 12. Product language

Use user language:

> Live · Open app · Deploy · Update · Needs attention · Fix with your AI

Avoid:

> Provision · Runtime · Execution environment · Deployment artifact ·
> Infrastructure · Resource allocation

## Final mental model

The user should feel:

```
My AI builds the app.
        ↓
Embarko hosts it.
        ↓
The panel tells me whether it is live and healthy.
        ↓
My AI handles most changes and fixes.
```

That is the UX we should design around.

## Product rule

**The panel shows the app and its state. The AI agent does the hosting work.**

If a screen exposes more infrastructure than necessary, simplify it.

## SEO

Every public page (anything reachable without signing in — marketing, docs,
pricing, showcase, legal) must follow [docs/SEO.md](docs/SEO.md): unique
title and description, keywords, correct robots/canonical behavior, and no
generated Open Graph image routes (production has no filesystem or
incremental cache to render them — use a committed static image instead).
Read it before adding or changing a public page.
