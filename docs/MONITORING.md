---
covers: ["app/lib/monitor/**", "app/api/monitor/**", "app/admin/health/**", "app/admin/monitoring/**", "migrations/0006_monitoring.sql"]
verified_at: 5836120
verified_on: 2026-10-26
---
# Monitoring, reports and alerts

Embarko checks itself every 5 minutes. It posts a short daily report and a weekly growth report to Slack, and alerts Slack as soon as something needs a person. The admin pages **Health** (`/admin/health`) and **Monitoring** (`/admin/monitoring`) show the same numbers and every setting.

## How does it run?

```
viaSocket flow (every 5 min)
  └─ POST https://embarko.ai/api/monitor/tick   header X-Monitor-Secret
       ├─ health checks          → monitor_health
       ├─ GET /admin/apps        → diff with last look → monitor_apps, monitor_events, monitor_gauges
       ├─ GET /admin/customer-query → monitor_queries
       ├─ alert rules            → monitor_alerts (dedup) → monitor_outbox
       ├─ daily / weekly due?    → monitor_outbox
       └─ answers { messages: [{ id, kind, channel, text }] }
  └─ for each message: Slack "Send message" to message.channel (or the flow's default channel)
  └─ if the call failed: Slack "Monitoring can't reach Embarko"
```

- **Scheduler outside Cloudflare and outside our backend.** The flow still runs when embarko.ai or the API is down, so it can say so.
- **The Worker does all the thinking.** The flow only calls the route and posts what it gets back. Times, channels and thresholds are read from settings on every check, so changing them never means editing the flow.
- **A message is handed over once.** After `tick` returns it, it is marked handed over and never returned again. A Slack failure after that shows in the flow's run history, not here.
- **"Run checks now"** on Health or Monitoring runs the same check as a signed-in admin, but leaves messages queued for the scheduler. Pressing it never posts to Slack.

## How do I set it up?

1. **Create the tables in production.** Apply `migrations/0006_monitoring.sql` to the `hostnsoft-ab` D1 database:
   `npx wrangler d1 migrations apply hostnsoft-ab --remote` (run it from the `socket` Cloudflare account). Until then every monitor route answers 503 "Monitoring tables are missing".
2. **Add two secrets** in the Cloudflare dashboard (Worker `hostnsoft` → Settings → Variables and Secrets). `keep_vars` keeps them across deploys.
   - `MONITOR_SECRET`: a long random string, also pasted into the viaSocket flow.
   - `MONITOR_PROXY_TOKEN`: the `proxy_auth_token` of a super-admin account kept for monitoring. It reads `/admin/apps` and `/admin/customer-query` upstream. If it expires or loses admin access, the critical alert "Monitoring can't read app data" fires within 15 minutes.
3. **Build the viaSocket flow** (one flow, in the workspace that owns Embarko's Slack connection):
   - Trigger: cron, `*/5 * * * *`.
   - Step `check`: `POST https://embarko.ai/api/monitor/tick` with header `X-Monitor-Secret`, timeout 50 s. Return the JSON.
   - Step `send`: if `context.res.check.messages` exists, send each `text` with Slack "Send message" to its `channel`. The channel always comes from `/admin/monitoring`, so changing it there needs no flow edit.
   - Step `unreachable`: if `context.res.check` has `error` or no `messages` array, send "🔴 Monitoring can't reach Embarko" once per hour (remember the last send in viaSocket Memory).
   - A failed step does not stop a viaSocket run and its caller still gets 200, so every step checks the one before it.
4. **Open `/admin/monitoring`.** Set at least one Slack channel (an empty field uses the reports channel; with none set, messages wait in the queue), press **Send test message**, and wait up to 5 minutes for it in Slack. Every other setting already has a working default.

## What does each number mean?

Defined once in `app/lib/monitor/metrics.ts`; the Health page, the reports and the alerts all call it.

| Number | Meaning |
|---|---|
| Deploys | Deploys by signed-in workspaces, as recorded by hostnsoft-api. Temporary apps are counted on their own. |
| Failed deploys | Deploys whose latest outcome is `failed`. With several deploys of one app between two checks, at most one counts as failed. |
| New apps | Workspace apps first seen in the period. |
| Temporary apps created / kept / expired | First seen, claimed into a workspace, or gone from the list, in the period. "Early" means gone more than an hour before its expiry time. |
| Kept rate | Of temporary apps created in the period, the share claimed so far. |
| New workspaces | Workspaces whose first app appeared or was claimed in the period. |
| Live now / failing | Apps whose latest deploy succeeded / failed, at the end of the period. |
| Customer queries open / overdue | Not marked resolved on the Health page; overdue past the overdue setting. |
| Uptime | Share of health checks that answered 2xx in time. |
| Website visitors / prompt copies | Distinct visitors in `hero_events`, bots filtered the same way as `/api/metrics`. |
| Signups | **Not tracked yet.** hostnsoft-api has no signup record to read. |

**Missing data is never zero.** A period with no successful app-list read shows "no data". Under 80% of expected checks shows "Partial data".

**The first check is a baseline.** It records what exists and counts nothing. Events start from the second check. The very first check also skips that day's report instead of sending an empty one.

**Queries on day one.** The first import marks queries older than the overdue time as `before_monitoring`, not open, so old answered queries don't all read as overdue.

## What alerts are there, and when do they fire?

Every row is editable on `/admin/monitoring`: on/off, level, threshold, minimum volume and repeat time.

| Alert | Default level | Fires when | Repeats after |
|---|---|---|---|
| Service down | Critical | A health check fails 2 times in a row | 1 h |
| Monitor can't read app data | Critical | 3 app-list reads fail in a row | 6 h |
| Deploys failing | Critical | ≥ 50% of deploys failed in the last hour, with ≥ 5 deploys | 3 h |
| Temporary apps not cleaned up | Warning | ≥ 1 temporary app online 2 h past its 24 h | 6 h |
| Deploys up or down | Warning | Last 24 h differs ≥ 60% from the median of the 7 days before, with ≥ 10 on a usual day | 24 h |
| Temporary apps up or down | Warning | Same, with ≥ 5 on a usual day | 24 h |
| New workspaces up or down | Info | Same, with ≥ 3 on a usual day | 24 h |
| Customer queries overdue | Warning | ≥ 1 query open over 48 h | 24 h |
| Bug report waiting | Warning | A `platform_bug` query open over 4 h | 12 h |

- **Critical** goes out at once. **Warning** waits until quiet hours (default 22:00–08:00) end. **Info** only appears in the daily report.
- **One problem, one message.** An alert is sent again only when its level rises or its repeat time passes, and sends one "Resolved" when it clears.
- **Trend alerts warm up first.** For the first 14 days of history they are info only. Days with no successful check are left out of "usual".

## When do the reports go out?

- **Daily**, default 09:30 Asia/Kolkata: the last 24 hours, open alerts, and "worth knowing" (info and trend findings).
- **Weekly**, default Monday 09:30: the last 7 days against the 7 before, with up to three "what to look at" steps picked from what moved most (`app/lib/monitor/report.ts:recommendations`).
- A report is queued on the first check at or after its time, once per day (`monitor_sends`). If the scheduler is down at 09:30, the report goes out when it comes back that day.

## What can't it see yet?

These need hostnsoft-api changes. Its owner makes them; this repo doesn't edit that repo.

| Missing | Why it matters | What hostnsoft-api would add |
|---|---|---|
| Signups and their source | No signup count, source or anonymous → signup link | A signup record with source/UTM; this site would pass landing variant and `visitor_id` at sign-in |
| Service auth for the monitor | Today it borrows a person's sign-in token | An internal-secret route returning the app list, queries and counts with `from`/`to` |
| Temporary-app deploys | Not recorded upstream (`/internal/deployments/record` refuses without a workspace) | Record them, flagged temporary |
| Expiry and claim records | Inferred by comparing checks; a teardown failure is only a log line | A `project.claim` / `project.expired` audit row, and teardown result |
| Query status | Triage lives in D1 here | `status`, `resolvedAt`, `assignee` on customer queries |
| Finer deploy source | Only `dashboard` / `agent` plus a self-reported agent name | MCP / API / CLI / skill, and a short failure code |
| Deep health | `/api/health` is static and doesn't check the database | A health route that checks the database, Redis and the deploy service |

When one lands, change the collector in `app/lib/monitor/tick.ts` and the definition in `metrics.ts`; the page, reports and alerts follow.

## How do I test it locally?

1. `npx wrangler d1 migrations apply hostnsoft-ab --local`
2. Put `MONITOR_SECRET=<anything>` in `.env.local` (gitignored), and `MONITOR_PROXY_TOKEN` if you have a super-admin token.
3. `npm run dev`, then
   `curl -X POST localhost:3000/api/monitor/tick -H 'x-monitor-secret: <anything>'`.
   It answers what it read, what fired and the messages it handed over.

Without a token, app data reads fail on purpose. That exercises the "no data" path and the "can't read app data" alert after 3 checks.
