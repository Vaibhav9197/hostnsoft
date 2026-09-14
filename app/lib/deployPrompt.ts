import { readLpVariant } from "./gtm";
import { variantForPath } from "./variants";

/** The canonical "copy prompt for agent" text — shared by the landing page's
 *  hero CTA, the docs page's "Install the skill" panel, and the console so they
 *  never drift out of sync.
 *
 *  It states the intent and points at the skill; it does NOT restate the API.
 *  Endpoints, headers, auth, packaging, polling and error codes live in the
 *  skill and at embarko.ai/docs, which are maintained with the platform — a
 *  prompt that inlines them is a copy that goes stale in someone's chat
 *  history, and it makes the agent reason about HTTP instead of about
 *  deploying.
 *
 *  Three escape hatches, in descending order of how much they do for you: the
 *  skill, the same script fetched standalone (for agents with no `npx`), and
 *  the docs for anything that can't run either. The standalone script is the
 *  byte-identical file the skill ships — `npm run sync:skill` publishes it to
 *  /skills/embarko-deploy.sh — so the fallback can't drift into being a
 *  lesser deploy path than the skill's. */

/** Stands in for the visitor's landing-page arm wherever a real one isn't
 *  known yet — server render, and the docs page before hydration. */
const VARIANT_PLACEHOLDER = "<alpha|beta|gamma|delta>";

/** `EMBARKO_LP_VARIANT` rides along to the deploy service (the deploy script
 *  forwards it as the `lp_variant` header) so a deploy can be attributed back
 *  to the landing page that produced it.
 *
 *  `appName` names an app that already exists, so a prompt copied from inside
 *  one redeploys that app rather than standing up a second copy on a second
 *  subdomain. Omitted on the marketing pages, where there is no app yet. */
function build(variantLine: string, appName?: string | null): string {
  /* Named explicitly even though the skill can pick a name: the skill only
     knows the folder it is run from, and the platform treats a name it hasn't
     seen as a brand-new app. */
  const nameLine = appName
    ? `\nDeploy it as the existing Embarko app "${appName}" — that exact name, so it updates that app instead of creating a new one.`
    : "";
  return `Embarko is Cloud for small apps.
Deploy this app to Embarko.

Install the Embarko deploy skill and follow it:
npx skills add embarko-ai/skill --skill embarko-deploy -g${nameLine}

If npx is unavailable, run the same deploy script directly instead:
curl -fsSL https://embarko.ai/skills/embarko-deploy.sh -o /tmp/embarko-deploy.sh && bash /tmp/embarko-deploy.sh
${variantLine}
If you cannot install it, the full reference is at https://embarko.ai/docs`;
}

/** The documentation form: the attribution variable is shown, with its allowed
 *  values in place of a real one. Safe to render on the server — it depends on
 *  nothing request-specific, so it can't cause a hydration mismatch. */
export const DEPLOY_PROMPT = build(
  `Run the deploy with EMBARKO_LP_VARIANT=${VARIANT_PLACEHOLDER} set in the environment.`,
);

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
  return build(
    variant ? `Run the deploy with EMBARKO_LP_VARIANT=${variant} set in the environment.` : "",
  );
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
export const CONSOLE_DEPLOY_PROMPT = build("");

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
  return build("", appSlug);
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
