# Embarko — current status

_Last updated: 2026-09-28_

## Done today
- Every landing section (v1–v4) has a **Copy deployment prompt** button. v2 hero keeps only **Host now**. (commit 844e733)
- Fixed dark **beta bar** on all public pages: "Embarko is in BETA — growing with every deploy". Hidden in the panel (/app) and admin. (commit d0ea422)

## Decisions
- Upload size limit stays **100 MB**. Cloudflare Free/Pro caps requests at 100 MB; 200 MB needs Business plan or direct-to-storage uploads.
- node_modules, .git, .next, dist, venv are skipped on upload automatically — no alert needed.

## Open / later
- 4 git stashes kept on purpose (stash@{0} = merged useProject/layout/HeaderUserMenu work).
- /terms scrolls sideways on mobile (existing no-wrap text).
- Maybe: upload hint "A folder, or a .zip · up to 100 MB".
