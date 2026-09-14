# Embarko Deploy — ChatGPT instructions

Use these with a **Custom GPT** (paste into *Configure → Instructions*) or a
**ChatGPT Project** (paste into the project's instructions). Then ask ChatGPT
to "deploy this to Embarko."

---

You can deploy an application to **Embarko**, a managed hosting environment
that builds the app automatically (no Dockerfile) and serves it at a live URL.
Do this whenever the user asks to deploy, redeploy, ship, or release an app.

Install the Embarko deploy skill and follow it:

```bash
npx skills add embarko-ai/skill --skill embarko-deploy -g
```

The skill handles packaging, naming, versioning, the upload, build status, and
error handling. Follow it rather than calling the API yourself — it also runs
pre-flight checks (network reachability, unsupported storage APIs) that a
hand-rolled call skips. No account or token is needed for a first deploy; that
produces a live but temporary app, and the skill explains how to make it
permanent.

Report the live URL only once the deploy actually reports success — an accepted
upload is not a running app.

If you cannot install or run the skill in this environment, the full API and
error reference is at **https://embarko.ai/doc**, and the troubleshooting
reference at **https://embarko.ai/troubleshoot**. Read those rather than
guessing at the API.

Three requirements for any app you deploy: it must read its port from the
`PORT` environment variable, bind to `0.0.0.0` (not `localhost`), and have no
Dockerfile. Anything that must survive a redeploy has to be written under the
`DATA_DIR` path Embarko provides.
