import { readLpVariant } from "./gtm";
import { variantForPath } from "./variants";
import { SITE } from "./site";

/** The canonical "copy prompt for agent" text — shared by the landing page's
 *  hero CTA, the docs page's "Install the skill" panel, and the console so they
 *  never drift out of sync.
 *
 *  It states the intent and points at the skill; it does NOT restate the API.
 *  Endpoints, headers, auth, packaging, polling and error codes live in the
 *  skill and at embarko.ai/docs/agent-quickstart.md, which are maintained with the
 *  platform — a
 *  prompt that inlines them is a copy that goes stale in someone's chat
 *  history, and it makes the agent reason about HTTP instead of about
 *  deploying.
 *
 *  The URL is the raw markdown (/docs/agent-quickstart.md), not the rendered page at
 *  /docs. Same content, served from the same bundled string, but the agent
 *  gets ~40 KB of prose instead of ~133 KB of HTML to extract it from.
 *
 *  It leads with the docs URL, not with `npx skills add` or a piped install
 *  script. Both of those are executable code from a domain the agent has
 *  never heard of, and capable agents are trained to refuse exactly that
 *  shape — observed in the wild: the agent declined both install paths,
 *  spent a turn explaining supply-chain risk, and only then fell through to
 *  the docs. Fetching a page is the one first move no agent refuses, and the
 *  docs send it straight back to the script (fetch, read, run) — so the skill
 *  is still the deploy path, just reached through a door that opens.
 *
 *  It also states the credential posture up front, because without it the
 *  agent reads the docs' own quick start and blocks on obtaining a token
 *  before it has packaged anything. What that posture should be depends on
 *  who is copying — see `build` below. */

/** Stands in for the visitor's landing-page arm wherever a real one isn't
 *  known yet — server render, and the docs page before hydration. */
const VARIANT_PLACEHOLDER = "<alpha|beta|gamma|delta>";

/** Who is copying the prompt, which is what decides the credential line. */
type PromptContext = {
  /** Landing-page attribution, or "" where it doesn't apply. */
  variantLine?: string;
  /** An app that already exists — the prompt should update it, not fork it. */
  appName?: string | null;
  /** A raw token, available only on the tokens page as it's first shown. */
  token?: string | null;
  /** Copied from inside the console, so there's an account to deploy into. */
  signedIn?: boolean;
};

/** `EMBARKO_LP_VARIANT` rides along to the deploy service (the deploy script
 *  forwards it as the `lp_variant` header) so a deploy can be attributed back
 *  to the landing page that produced it.
 *
 *  Four credential situations, and the right instruction differs in each.
 *  Getting it wrong either turns a 30-second trial into a signup wall, or
 *  drops the app somewhere the owner can't see it:
 *
 *  - **`token`** — copied from the tokens page while the raw token is on
 *    screen. Use it.
 *  - **`appName`** — copied from inside an existing app, which is already
 *    claimed, so an anonymous deploy can't update it.
 *  - **`signedIn`** — the console's "Deploy an app". There's an account, so
 *    the deploy must be authenticated: an anonymous deploy creates the
 *    project under an orphan company (see the API's projectClaim.ts), so it
 *    would never appear in this person's "Your apps" and would be torn down
 *    24h later — the opposite of what clicking Deploy in your own console
 *    promises.
 *  - **none of the above** — the marketing pages. Nobody has an account yet
 *    and the whole pitch is that they don't need one. */
function build({ variantLine = "", appName, token, signedIn }: PromptContext): string {
  /* Named explicitly even though the skill can pick a name: the skill only
     knows the folder it is run from, and the platform treats a name it hasn't
     seen as a brand-new app. */
  const nameLine = appName
    ? `\nRedeploy it as the existing Embarko app "${appName}" — that exact name, so it updates that app instead of standing up a second one on a second subdomain.`
    : "";

  /* Where a token is needed, name both places the skill looks — the
     environment and the credential file it falls back to — so the agent
     stores it once and every later deploy is authenticated without the owner
     being asked again. */
  const useSavedToken =
    "use DEPLOY_TOKEN or ~/.embarko/credentials if either is already set";
  const askForToken =
    `if neither is, ask me for one — I can create it on the "Deploy tokens" page at ${SITE}/app/tokens — and save it to ~/.embarko/credentials so later deploys reuse it`;

  let credentialLines: string;
  if (token) {
    credentialLines = `Use this Embarko deploy token: ${token}
Set it as DEPLOY_TOKEN and save it to ~/.embarko/credentials so later deploys reuse it. Don't deploy anonymously.`;
  } else if (appName) {
    credentialLines = `That app is already claimed, so this needs my deploy token: ${useSavedToken}, and ${askForToken}.`;
  } else if (signedIn) {
    credentialLines = `Deploy it under my account, not anonymously: ${useSavedToken}, and ${askForToken}.
This matters — an anonymous deploy isn't attached to my account, so it won't show up in my Embarko console and is deleted after 24 hours.`;
  } else {
    credentialLines = `Deploy anonymously first — no token, no account — then give me the live URL.
Only once it's live, ask me for my email: Embarko mails back a token that makes the app permanent.`;
  }

  return `Deploy this app to Embarko — cloud hosting for small apps. No Dockerfile, no signup.

Read ${SITE}/docs/agent-quickstart.md and follow it. Nothing to install.${nameLine}
${credentialLines}
${variantLine}
Faster, if your tools let you install one: npx skills add embarko-ai/skill --skill embarko-deploy -g`;
}

/** The documentation form: the attribution variable is shown, with its allowed
 *  values in place of a real one. Safe to render on the server — it depends on
 *  nothing request-specific, so it can't cause a hydration mismatch. */
export const DEPLOY_PROMPT = build({
  variantLine: `Run the deploy with EMBARKO_LP_VARIANT=${VARIANT_PLACEHOLDER} set in the environment.`,
});

/**
 * The prompt as an agent should actually receive it, with the visitor's arm
 * filled in.
 *
 * With no arm known the line is dropped entirely rather than left as a
 * placeholder: an agent reading `EMBARKO_LP_VARIANT=<alpha|beta|gamma|delta>`
 * would send that string verbatim, which is worse than no attribution at all.
 * That happens whenever the cookie is missing — a visitor who reached /docs
 * without ever landing on `/`, or one who clears cookies.
 */
export function deployPromptFor(variant: string | null): string {
  return build({
    variantLine: variant
      ? `Run the deploy with EMBARKO_LP_VARIANT=${variant} set in the environment.`
      : "",
  });
}

/**
 * The console's form of the prompt: no landing-page attribution at all.
 *
 * The variable exists to attribute a deploy to the landing page that produced
 * it. Inside the console the visitor is already a signed-in customer acting on
 * their own account, so whatever arm their cookie still carries from an earlier
 * marketing visit says nothing about where THIS deploy came from — sending it
 * would attribute the deploy to a page that had no part in it.
 */
export const CONSOLE_DEPLOY_PROMPT = build({ signedIn: true });

/**
 * The console prompt with the app already named.
 *
 * Copied from inside an app, the prompt is for redeploying *that* app, and the
 * name is what decides which one the deploy lands on — the platform treats a
 * name it hasn't seen as a new app, so leaving `<name>` for the reader to fill
 * in is how you end up with a second copy of your site on a second subdomain.
 *
 * Pass the slug, not the display name: `X-App-Name` is also the live
 * subdomain, and the two are only the same string until someone renames one.
 * Falls back to the placeholder when the slug hasn't loaded, so a prompt
 * copied early is generic rather than addressed to "undefined".
 */
export function consoleDeployPromptFor(appSlug: string | null | undefined): string {
  return build({ appName: appSlug, signedIn: true });
}

/**
 * The console prompt with a freshly issued deploy token inside it.
 *
 * Handed out exactly once, from the tokens page, at the moment the raw token
 * is on screen. A bare `hns_…` string leaves the owner to work out what to do
 * with it; this is the one thing they paste into their agent instead — the
 * deploy instructions and the credential together, so the agent needs nothing
 * else from them.
 */
export function consoleDeployPromptWithToken(token: string): string {
  return build({ token, signedIn: true });
}

/**
 * Which arm the visitor is copying from, for attribution.
 *
 * The page wins over the cookie. A direct hit on /v1../v4 — QA, or a shared
 * link — shows a landing page that need not match the arm the visitor was
 * bucketed into, and the honest answer is the page the copy actually came
 * from. For everyone else the path is `/` or /docs, which says nothing, so the
 * cookie decides.
 */
function currentVariant(): string | null {
  if (typeof window === "undefined") return null;
  return variantForPath(window.location.pathname) ?? readLpVariant();
}

/** The prompt for whoever is looking at the page right now. Client-only — it
 *  reads the page path and the `lp_variant` cookie middleware.ts sets. */
export function currentDeployPrompt(): string {
  return deployPromptFor(currentVariant());
}
