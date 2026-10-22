---
covers: ["app/privacy/**", "app/terms/**", "app/dpa/**"]
verified_at: 105ccbb
verified_on: 2026-10-21
---
# Legal pages — values still to add

These values were removed from `/privacy`, `/terms` and `/dpa` on 2026-10-19
because nobody had approved them. Each one needs a confirmed value from
legal, billing or the platform team. Then add it back to the page named
under each item.

Do not guess. A wrong value in these pages is a legal risk, not a typo.

## Must have before launch

These are legally required, or leaving them out puts the company at risk.

- [ ] **Compute provider name** — `app/dpa/page.tsx`, the `SUB_PROCESSORS` row
      "Cloud infrastructure provider". GDPR Art. 28(2) requires each
      sub-processor to be named. Product rule: never name it on any other
      public page.
- [x] **Compute and storage location** — the same DPA row. Set to India,
      United States, Europe on 2026-10-19.
- [x] **Lago location** — DPA, `SUB_PROCESSORS` row "Lago". Set to India,
      United States, Europe on 2026-10-19.
- [ ] **International transfer mechanism** (for example, Standard Contractual
      Clauses plus the UK Addendum). Add back:
  - the DPA section "International transfers" (between sections 7 and 8)
  - the Privacy section "Where your data is held".
- [ ] **Limitation of liability cap** (for example, fees paid in the last 12
      months). Terms section 10, after "indirect or consequential damages".
- [ ] **Governing law and court jurisdiction.** Terms section 12, now titled
      "Your legal rights". Rename it back to "Governing law" when you add
      them. The operating entity is SuperHeroes Inc., Indore, India.

## Retention and deletion

- [x] **Build, deploy and runtime log retention.** Set to 30 days on
      2026-10-19, in Privacy "How long we keep it" and DPA section 2 "Logs".
      Logs are read live from Nomad, so the platform must actually delete
      them after 30 days for the pages to stay true.
- [ ] **Billing record retention period** (the period tax law requires).
      Privacy, "How long we keep it", the item about invoices.
- [x] **How soon apps are deleted after account closure.** Set on 2026-10-19:
      every deletion (app, workspace, account closure, termination) can be
      undone or exported for 7 days, then is permanent. In Terms section 9,
      Privacy "How long we keep it" and DPA section 3.
- [ ] **Build the 7-day restore.** The pages now promise it, but deletion
      in `hostnsoft-api` and `hostnsoft-deploy` is immediate today — there is
      no soft delete. Until it exists, restores by email cannot be honoured.
- [ ] **Backup retention after closure.** Add only once backups exist. As of
      2026-09-22 they did not. Also check the other mentions of backups on
      these pages ("restoring backups", "on the plans that have them").
- [ ] **Confirm the 100-day request-record retention in production.** It is
      the code default (`ANALYTICS_RETENTION_DAYS` in `hostnsoft-deploy`).
      Check that the production environment does not override it.

## Notice periods and terms

- [ ] **Price-change notice period** (for example, 30 days). Terms section 4.
      It now says only "we will give notice".
- [ ] **Sub-processor change notice period.** DPA section 7. It now says only
      "we will give you notice".
- [x] **Account termination grace period.** Terms section 9: 7 days to ask
      for a copy of the data. Set on 2026-10-19.
- [ ] **SLA.** Terms section 8 says there is no uptime guarantee on public
      plans. If any plan gets an SLA, state it there.
- [x] **Audit rights.** DPA section 5, "Audits". Set on 2026-10-19:
      documents first, then an inspection with 30 days' notice, at most once
      a year, customer pays. Have legal review before launch.

## Privacy rights

- [ ] **Response time for privacy requests** (GDPR allows up to one month).
      Privacy, "Your rights".
- [ ] **Lead privacy regulator** (supervisory authority). Privacy,
      "Your rights", after "local data protection authority".

## When you add values

1. Change the "updated" date at the top of each page you edit.
2. Email account holders if the change is material. The pages promise this.
3. Tick the item here, or delete this file once every item is done.
