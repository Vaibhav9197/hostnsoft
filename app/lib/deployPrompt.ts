import { SITE, appUrl } from "./site";

/** The canonical "copy prompt for agent" text, shared by the landing page,
 *  the docs and the console so they never drift apart.
 *
 *  Two lines: the intent and the quickstart URL. Everything else (access,
 *  packaging, polling, errors) lives in /docs/quickstart.md, which is
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
    `Read ${SITE}/docs/quickstart.md and follow it. Nothing to install.`,
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
 * Falls back to the generic prompt when the slug hasn't loaded. With a token,
 * the agent uses it instead of asking for one.
 */
export function consoleDeployPromptFor(appSlug: string | null | undefined, token?: string | null): string {
  return build({ appName: appSlug, token, signedIn: true });
}

/** The console prompt with a freshly issued deploy token inside it. */
export function consoleDeployPromptWithToken(token: string): string {
  return build({ token, signedIn: true });
}

/**
 * The empty console's main action: keep an app deployed before signing up,
 * with a token made on the spot. No app name — the agent that deployed it
 * still has the project and knows the name it used, so the person has
 * nothing to look up or paste.
 */
export function consoleKeepPromptWithToken(token: string): string {
  return `Keep the Embarko app you deployed for me without an account. It will be deleted after 24 hours unless it's claimed.

Read ${SITE}/docs/claim.md and follow it: redeploy that same app with the exact same name, using this Embarko deploy token: ${token}
Set it as DEPLOY_TOKEN and save it to ~/.embarko/credentials so later deploys reuse it. Don't print the token back to me.

If you haven't deployed an app to Embarko in this project, tell me instead of deploying a new one.

Then confirm the deploy succeeded and tell me the app is now permanent.`;
}

/**
 * After the claim link has done its job: the app is permanent, and the
 * agent that deployed it needs the account's token for every later deploy
 * of that name — an anonymous redeploy of a claimed name is refused. Made
 * on the claim page's success screen with a token created on the spot, so
 * the person has nothing to look up. Nothing is deployed by this prompt.
 */
export function consoleClaimedPromptWithToken(appName: string, token: string): string {
  return `My Embarko app "${appName}" (${appUrl(appName)}) is claimed now: it's permanent and belongs to my account, so nothing needs redeploying for that.

From now on every deploy of it needs my deploy token — an anonymous redeploy of that name is refused. Use this Embarko deploy token: ${token}
Set it as DEPLOY_TOKEN and save it to ~/.embarko/credentials (chmod 600) so later deploys reuse it. Don't print the token back to me.

When I ask for changes, redeploy it as the existing app "${appName}", that exact name, with that token. Read ${SITE}/docs/quickstart.md if you need the deploy steps.`;
}

/**
 * "Fix with your AI" for a scheduled job that is failing. Carries what the
 * agent needs to start without asking: which app, which job, and the last
 * error, plus where the run history is. The agent fixes the route in the
 * same project and redeploys the same app name, which re-runs the job.
 *
 * The failing-job email's "Fix with your AI" (via the /fix page) copies the
 * same prompt, built server-side (hostnsoft-api
 * src/services/scheduleAlerts.ts fixPrompt): change both.
 */
export function consoleFixSchedulePrompt(input: {
  appName: string;
  job: string;
  path: string;
  scheduleId: string;
  error: string | null;
  reply: string | null;
}): string {
  const { appName, job, path, scheduleId, error, reply } = input;
  const lastError = [error, reply && reply !== error ? `the app replied: ${reply}` : null].filter(Boolean).join("; ");
  return `My Embarko app "${appName}" (${appUrl(appName)}) has a scheduled job that is failing: ${job} (GET ${path}).
Last error: ${lastError || "unknown"}.

Read ${SITE}/docs/schedules.md and fix it. Use my deploy token: DEPLOY_TOKEN or ~/.embarko/credentials if either is set; if neither is, ask me for one from ${SITE}/app/tokens and save it to ~/.embarko/credentials.
Check the job's recent runs at https://ship.embarko.ai/api/apps/${appName}/schedules/${scheduleId}/runs, fix the route in this app's code, then redeploy it as the existing app "${appName}" — that exact name. Tell me it's fixed only when the job's test run says "ok".`;
}

