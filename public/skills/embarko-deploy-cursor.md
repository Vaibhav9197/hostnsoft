# Embarko Deploy — Cursor / Windsurf / agent IDE rule

Save this in your project as an agent rule so any AI IDE can deploy:
- **Cursor:** `.cursor/rules/embarko-deploy.md`
- **Windsurf / others:** `AGENTS.md` at the repo root.

Then tell the agent to "deploy this to Embarko."

---

Deploy this project to **Embarko** whenever the user asks to deploy, redeploy,
ship, or release it. Embarko builds the app automatically (no Dockerfile) and
serves it at a live URL.

Install the Embarko deploy skill once, then follow it:

```bash
npx skills add embarko-ai/skill --skill embarko-deploy -g
```

For a repo-local install instead of global, drop the `-g`.

The skill handles packaging, naming, versioning, the upload, build status, and
error handling — follow it rather than assembling your own `tar`/`curl` calls.
It also runs pre-flight checks (network reachability, unsupported storage APIs)
that a hand-rolled call skips, and it waits for the build, so a clean exit is
the real confirmation. No account or token is needed for a first deploy; that
produces a live but temporary app, and the skill explains how to make it
permanent.

Report the live URL only once the skill's deploy exits successfully — an
accepted upload is not a running app.

When a deploy fails, match the reported error `code` against the skill's
`scripts/troubleshoot.md` (or https://embarko.ai/troubleshoot), fix it, and run
the same command again — don't retry blindly and don't work around it with raw
API calls.

Full platform reference, if you need anything the skill doesn't cover:
**https://embarko.ai/doc**.

Three requirements for any app deployed here: it must read its port from the
`PORT` environment variable, bind to `0.0.0.0` (not `localhost`), and have no
Dockerfile. Anything that must survive a redeploy has to be written under the
`DATA_DIR` path Embarko provides.
