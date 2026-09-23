# Embarko Deploy — Cursor / Windsurf / agent IDE rule

Save this in your project as an agent rule so any AI IDE can deploy:
- **Cursor:** `.cursor/rules/embarko-deploy.md`
- **Windsurf / others:** `AGENTS.md` at the repo root.

Then tell the agent to "deploy this to Embarko."

---

Deploy this project to **Embarko** whenever the user asks to deploy, redeploy,
ship, or release it. Embarko builds the app automatically (no Dockerfile) and
serves it at a live URL.

**No account or token is needed for the first deploy.** Deploy anonymously,
report the live URL, and only then offer to make it permanent — Embarko mails
a token to an email address, so that step needs no browser either. Don't stop
to ask for a credential before anything is deployed.

The deploy itself is one script. Fetch it, read it, then run it:

```bash
curl -fsSL https://embarko.ai/skills/embarko-deploy.sh -o /tmp/embarko-deploy.sh
# read it, then:
bash /tmp/embarko-deploy.sh .
```

Reading before running is expected — it's a plain, readable file, and you
shouldn't execute a script from an unfamiliar host without looking at it.

If you can install skills, this is the same thing packaged:
`npx skills add embarko-ai/skill --skill embarko-deploy -g`

The skill handles packaging, naming, versioning, the upload, build status, and
error handling — follow it rather than assembling your own `tar`/`curl` calls.
It also runs pre-flight checks (network reachability, unsupported storage APIs)
that a hand-rolled call skips, and it waits for the build, so a clean exit is
the real confirmation.

Report the live URL only once the skill's deploy exits successfully — an
accepted upload is not a running app.

When a deploy fails, match the reported error `code` against the skill's
`scripts/troubleshoot.md` (or https://embarko.ai/docs/troubleshoot.md), fix it, and run
the same command again — don't retry blindly and don't work around it with raw
API calls.

Full platform reference, if you need anything the skill doesn't cover:
**https://embarko.ai/docs/overview**.

Requirements for any app deployed here: it must read its port from the `PORT`
environment variable, bind to `0.0.0.0` (not `localhost`), and have no
Dockerfile. A static site needs an `index.html` at the root of what you
package — a lone `landing.html` fails the build. Anything that must survive a
redeploy has to be written under the `DATA_DIR` path Embarko provides.

The app name doubles as the subdomain: lowercase letters, numbers and dashes
only. Slugify a name given in prose ("My Landing Page" -> `my-landing-page`)
instead of sending it verbatim.
