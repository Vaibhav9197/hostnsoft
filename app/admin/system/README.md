# How Embarko is made (`/admin/system`)

The Live PRD: the product explained story by story, built from the code of
all three Embarko repos — `hostnsoft` (this one), `hostnsoft-api` (`@api`) and
`hostnsoft-deploy` (`@deploy`). Platform admins only. It reads; it never writes.

## Using it

- Each card is one user story. **Zoom** opens it.
- Inside a story, pick a step to narrow every tab to that step.
- Four tabs:
  - **Why**: who it's for and what changes for them.
  - **Flow**: the steps, the choices and what can go wrong.
  - **System map**: the parts that do the work.
  - **Tables**: what gets written down, with real rows.
- Pick a **version** to see what changed in that commit.
- Keys: `1`–`4` switch tabs, `←`/`→` move between steps, `Esc` closes.
- The header's **System map** and **Tables** buttons show the whole product.
- Every popup state is in the URL hash, so you can share a link to exactly what you see.

## Where it comes from

| Layer | File | Made by |
|---|---|---|
| Facts (screens, endpoints, modules, tables, services) | `app/lib/system/facts.generated.json` | `scripts/build-system-map.mjs`. Git-ignored and rebuilt before `dev`, `build`, `preview` and `deploy`. `next dev` also rescans on every page load. Reads the sibling repos from `../hostnsoft-api` and `../hostnsoft-deploy` (or `HOSTNSOFT_API_DIR` / `HOSTNSOFT_DEPLOY_DIR`), read-only. |
| Sibling snapshot | `app/lib/system/facts.repos.json` | The same script. Committed, so a checkout without the sibling repos still has their facts. |
| Story (parts, flows, user stories) | `app/lib/system/story.ts` | People |
| Versions | `app/lib/system/history.generated.json` | `scripts/build-system-history.mjs`, from the git history of all three repos. Committed, because production builds without `.git`. |
| Live rows and links | `/api/system/table`, `/api/system/graph` | Rows from the site database only (D1, read-only, through `DB_ADMIN`). The API and traffic databases live on the Embarko server, so they show structure from their schema, never rows. |

The page and `docs/prd/` both read the same model through `loadSystemMap()`
(`app/lib/system/map.ts`) and `storyHistories()` (`history.ts`).

## Changing a story

1. Edit `app/lib/system/story.ts`. Refs are fact IDs, for example `page:/app`,
   `api:/api/events`, `api:@deploy/apps`, `lib:@api/src/services/projectClaim`
   or `table:api:Project`. A ref ending in `/*` covers everything under that
   path. An Express endpoint belongs to the part that holds its file.
2. Write each failure as `Condition → result.` Leave an automatic step's
   failures empty rather than guess; the page lists it as an open question.
3. Run `npm run prd`, then `npm run prd:check`. The check fails while a ref
   is stale, a file belongs to no part, or `docs/prd/` is behind.

## Files

- `page.tsx` — the access gate and the server-side model.
- `access.tsx` — sign-in in place, plus the "removed" and "admins only" notices.
- `SystemPage.tsx` — the header, the cards, the PRD block and the hash state.
- `StoryModal.tsx` — the story popup, versions, the step bar and the Why tab.
- `FlowChart.tsx`, `MapView.tsx`, `TableViews.tsx`, `TablesCanvas.tsx` — the other views.
- `ui.tsx` — the popup shell, measured arrows, live table reads and the row grid.
- `system.css` — all the styles, prefixed `lp-`.
