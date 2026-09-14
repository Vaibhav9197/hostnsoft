#!/usr/bin/env bash
# Regenerate the downloadable skill assets under public/skills/ from the
# skill repo, which is their single source of truth.
#
#   npm run sync:skill                 # expects ../hostnsoft-skill
#   SKILL_REPO=/path/to/skill npm run sync:skill
#
# Both artifacts here used to be hand-maintained copies and both had
# drifted from the real skill — the published .sh had lost the
# connectivity probe, the storage pre-check, and status polling, and the
# packaged .skill predated several SKILL.md rewrites. Regenerate rather
# than edit anything in public/skills/ directly.
#
# The per-tool .md files in public/skills/ are NOT generated: they're
# short pointers to the skill and the docs, with nothing tool-agnostic
# left in them to drift.

set -euo pipefail

SKILL_REPO="${SKILL_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/hostnsoft-skill}"
PUBLIC_SKILLS="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/public/skills"

if [[ ! -f "${SKILL_REPO}/SKILL.md" ]]; then
  echo "ERROR: no skill repo at ${SKILL_REPO} (set SKILL_REPO=/path/to/hostnsoft-skill)." >&2
  exit 1
fi

echo "--> Syncing from ${SKILL_REPO}"

cp "${SKILL_REPO}/scripts/deploy.sh" "${PUBLIC_SKILLS}/embarko-deploy.sh"

# Staged in a temp dir so the archive's entries are rooted at
# embarko-deploy/ — the layout `npx skills add` and a manual unzip into
# .claude/skills/ both expect.
STAGE=$(mktemp -d)
trap 'rm -rf "${STAGE}"' EXIT
mkdir -p "${STAGE}/embarko-deploy"
cp "${SKILL_REPO}/SKILL.md" "${SKILL_REPO}/README.md" "${STAGE}/embarko-deploy/"
cp -R "${SKILL_REPO}/scripts" "${STAGE}/embarko-deploy/scripts"

rm -f "${PUBLIC_SKILLS}/embarko-deploy.skill"
(cd "${STAGE}" && zip -qr embarko-deploy.skill embarko-deploy)
mv "${STAGE}/embarko-deploy.skill" "${PUBLIC_SKILLS}/embarko-deploy.skill"

echo "--> Wrote:"
echo "    ${PUBLIC_SKILLS}/embarko-deploy.sh"
echo "    ${PUBLIC_SKILLS}/embarko-deploy.skill"
unzip -l "${PUBLIC_SKILLS}/embarko-deploy.skill"
