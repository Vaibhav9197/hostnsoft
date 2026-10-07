import { SITE } from "./site";

/** The canonical "copy prompt for agent" text, shared by the landing page,
 *  the docs and the console so they never drift apart.
 *
 *  Two lines: the intent and the quickstart URL. Everything else (access,
 *  packaging, polling, errors) lives in /docs/agent-quickstart.md, which is
 *  maintained with the platform. The raw markdown URL, not the rendered page,
 *  so the agent gets the prose without the HTML.
 *
 *  One extra line is added only where the quickstart can't know something:
 *  a token already in hand, an existing app to update, or that the person is
 *  signed in and must not get an anonymous deploy. */

/** Who is copying the prompt, which decides the extra line. */
type PromptContext = {
  /** An app that already exists. The prompt should update it, not fork it. */
  appName?: string | null;
  /** A raw token, available only while it is first shown. */
  token?: string | null;
  /** Copied from inside the console, so there's an account to deploy into. */
  signedIn?: boolean;
};

/**
 * - **`token`**: use it, so the agent doesn't ask for one again.
 * - **`appName`**: name it, because the platform treats a name it hasn't seen
 *   as a new app, on a second subdomain.
 * - **`signedIn`** without a token: an anonymous deploy lands under an orphan
 *   company, so it never shows in this person's console and is deleted after
 *   24 hours. Say so, or the agent may pick the quickstart's "skip".
 * - **none**: the marketing pages. The quickstart handles access.
 */
function build({ appName, token, signedIn }: PromptContext = {}): string {
  const lines = [
    "Deploy this app to Embarko — cloud hosting for small apps. No Dockerfile, no signup.",
    "",
    `Read ${SITE}/docs/agent-quickstart.md and follow it. Nothing to install.`,
  ];
  if (appName) lines.push(`Redeploy it as the existing Embarko app "${appName}" — that exact name, so it updates that app instead of standing up a second one on a second subdomain.`);
  const useSavedToken = "use DEPLOY_TOKEN or ~/.embarko/credentials if either is already set";
  const askForToken = `if neither is, ask me for one — I can create it on the "Deploy tokens" page at ${SITE}/app/tokens — and save it to ~/.embarko/credentials so later deploys reuse it`;
  if (token) {
    lines.push(`Use this Embarko deploy token: ${token}`);
    lines.push("Set it as DEPLOY_TOKEN and save it to ~/.embarko/credentials so later deploys reuse it. Don't deploy anonymously.");
  } else if (appName) {
    lines.push(`That app is already claimed, so this needs my deploy token: ${useSavedToken}, and ${askForToken}.`);
  } else if (signedIn) {
    lines.push(`Deploy it under my account, not anonymously: ${useSavedToken}, and ${askForToken}.`);
    lines.push("This matters — an anonymous deploy isn't attached to my account, so it won't show up in my Embarko console and is deleted after 24 hours.");
  } else {
    lines.push("Deploy anonymously first — no token, no account — then give me the live URL.");
    lines.push("Only once it's live, ask me for my email: Embarko mails back a token that makes the app permanent.");
  }
  lines.push("", "Faster, if your tools let you install one: npx skills add embarko-ai/skill --skill embarko-deploy -g");
  return lines.join("\n");
}

/** The public prompt: landing page and docs. */
export const DEPLOY_PROMPT = build();

/** The prompt for whoever is looking at the page right now. */
export function currentDeployPrompt(): string {
  return DEPLOY_PROMPT;
}

/** The console's "Deploy an app" prompt. */
export const CONSOLE_DEPLOY_PROMPT = build({ signedIn: true });

/**
 * The console prompt with the app already named, for redeploying that app.
 * Pass the slug, not the display name: `X-App-Name` is the live subdomain.
 * Falls back to the generic prompt when the slug hasn't loaded.
 */
export function consoleDeployPromptFor(appSlug: string | null | undefined): string {
  return build({ appName: appSlug, signedIn: true });
}

/** The console prompt with a freshly issued deploy token inside it. */
export function consoleDeployPromptWithToken(token: string): string {
  return build({ token, signedIn: true });
}

/**
 * "Keep that app": for an app deployed before signing up, which is deleted
 * 24 hours after its deploy unless claimed. Claiming is a redeploy of the same
 * name with the account's token, so the agent — which still has the project —
 * does it. Token handling mirrors the console prompt: use one already set, or
 * ask the person for one; never print it.
 */
export function consoleKeepPrompt(appName: string): string {
  return `Keep my Embarko app "${appName}" (https://${appName}.embarko.app). It was deployed without an account, so it will be deleted unless it's claimed.

Read ${SITE}/docs/agent-playbook.md#claim and follow it: redeploy this same app, with the same name "${appName}", using my deploy token — DEPLOY_TOKEN or ~/.embarko/credentials if either is set; if neither is, ask me for one from ${SITE}/app/tokens and save it to ~/.embarko/credentials.

Then confirm the deploy succeeded and tell me the app is now permanent.`;
}

/**
 * The empty console's main action: keep an app deployed before signing up,
 * with a token made on the spot. No app name — the agent that deployed it
 * still has the project and knows the name it used, so the person has
 * nothing to look up or paste.
 */
export function consoleKeepPromptWithToken(token: string): string {
  return `Keep the Embarko app you deployed for me without an account. It will be deleted after 24 hours unless it's claimed.

Read ${SITE}/docs/agent-playbook.md#claim and follow it: redeploy that same app with the exact same name, using this Embarko deploy token: ${token}
Set it as DEPLOY_TOKEN and save it to ~/.embarko/credentials so later deploys reuse it. Don't print the token back to me.

If you haven't deployed an app to Embarko in this project, tell me instead of deploying a new one.

Then confirm the deploy succeeded and tell me the app is now permanent.`;
}

/** "my-app.embarko.app", "https://my-app.embarko.app/x" or "my-app" → "my-app". */
export function appNameFromLink(input: string): string | null {
  const s = input.trim().toLowerCase().replace(/^https?:\/\//, "").split(/[/?#]/)[0];
  const name = s.endsWith(".embarko.app") ? s.slice(0, -".embarko.app".length) : s;
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(name) ? name : null;
}
