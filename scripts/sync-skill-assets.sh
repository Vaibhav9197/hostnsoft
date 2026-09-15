#!/usr/bin/env bash
# Regenerate the downloadable skill assets under public/skills/ from the
# skill repo, which is their single source of truth.
#
#   npm run sync:skill                      # from embarko-ai/skill @ main
#   SKILL_REF=v1.4.0 npm run sync:skill     # from a tag or commit sha
#   SKILL_DIR=../hostnsoft-skill npm run sync:skill   # from a local checkout
#
# Pulls from the PUBLISHED repo by default, deliberately. `npx skills add
# embarko-ai/skill` installs from that repo, and the prompt's no-npx
# fallback curls what we publish here — so the two must be the same bytes.
# An earlier version of this script copied from a sibling directory, which
# meant embarko.ai could serve a working copy that was never pushed, or was
# older than main, with nothing to reveal the difference. SKILL_DIR is kept
# only for iterating offline; prefer the default before releasing.
#
# Both artifacts here are generated. Never edit them in public/skills/ —
# edit the skill repo, push, and re-run this.
#
# The per-tool .md files in public/skills/ are NOT generated: they're short
# pointers to the skill and the docs, with nothing protocol-level left in
# them to drift.

set -euo pipefail

SKILL_SLUG="${SKILL_SLUG:-embarko-ai/skill}"
SKILL_REF="${SKILL_REF:-main}"
PUBLIC_SKILLS="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/public/skills"

WORK=$(mktemp -d)
trap 'rm -rf "${WORK}"' EXIT

if [[ -n "${SKILL_DIR:-}" ]]; then
  SOURCE="$(cd "${SKILL_DIR}" && pwd)"
  echo "--> Source: local checkout ${SOURCE}"
  echo "    (local copy — verify it matches ${SKILL_SLUG}@${SKILL_REF} before release)"
else
  echo "--> Source: ${SKILL_SLUG}@${SKILL_REF}"
  # codeload serves the tree at a ref without the aggressive CDN caching
  # raw.githubusercontent.com applies — that cache has already caused a
  # freshly pushed skill to read as stale.
  if ! curl -fsSL "https://codeload.github.com/${SKILL_SLUG}/tar.gz/${SKILL_REF}" \
       | tar -xz -C "${WORK}"; then
    echo "ERROR: couldn't download ${SKILL_SLUG}@${SKILL_REF}." >&2
    echo "Check the ref exists and the repo is reachable, or pass SKILL_DIR=<path>." >&2
    exit 1
  fi
  SOURCE=$(find "${WORK}" -maxdepth 1 -mindepth 1 -type d | head -1)
fi

for required in SKILL.md README.md scripts/deploy.sh scripts/troubleshoot.md; do
  if [[ ! -f "${SOURCE}/${required}" ]]; then
    echo "ERROR: ${required} missing from the skill source at ${SOURCE}." >&2
    exit 1
  fi
done

cp "${SOURCE}/scripts/deploy.sh" "${PUBLIC_SKILLS}/embarko-deploy.sh"

# Staged so the archive's entries are rooted at embarko-deploy/ — the
# layout `npx skills add` and a manual unzip into .claude/skills/ both
# expect. The upstream repo has SKILL.md at its root, so this is a
# re-root, not a straight copy of the tree.
mkdir -p "${WORK}/stage/embarko-deploy"
cp "${SOURCE}/SKILL.md" "${SOURCE}/README.md" "${WORK}/stage/embarko-deploy/"
cp -R "${SOURCE}/scripts" "${WORK}/stage/embarko-deploy/scripts"

rm -f "${PUBLIC_SKILLS}/embarko-deploy.skill"
(cd "${WORK}/stage" && zip -qr embarko-deploy.skill embarko-deploy)
mv "${WORK}/stage/embarko-deploy.skill" "${PUBLIC_SKILLS}/embarko-deploy.skill"

echo "--> Wrote:"
echo "    ${PUBLIC_SKILLS}/embarko-deploy.sh"
echo "    ${PUBLIC_SKILLS}/embarko-deploy.skill"
unzip -l "${PUBLIC_SKILLS}/embarko-deploy.skill"

# Printed so the commit that lands these artifacts can name exactly what
# produced them — the one thing a generated file can't say about itself.
if [[ -z "${SKILL_DIR:-}" ]]; then
  SHA=$(curl -fsSL "https://api.github.com/repos/${SKILL_SLUG}/commits/${SKILL_REF}" \
        | sed -n 's/.*"sha": "\([0-9a-f]\{40\}\)".*/\1/p' | head -1)
  echo "--> Generated from ${SKILL_SLUG}@${SKILL_REF} (${SHA:0:7})"
fi
