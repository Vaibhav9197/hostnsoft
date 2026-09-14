import { readLpVariant } from "./gtm";
import { variantForPath } from "./variants";

/** The canonical "copy prompt for agent" text — shared by the landing page's
 *  hero CTA, the docs page's "Install the skill" panel, and the console so they
 *  never drift out of sync.
 *
 *  It states the intent and points at the skill; it does NOT restate the API.
 *  Endpoints, headers, auth, packaging, polling and error codes live in the
 *  skill and at embarko.ai/doc, which are maintained with the platform — a
 *  prompt that inlines them is a copy that goes stale in someone's chat
 *  history, and it makes the agent reason about HTTP instead of about
 *  deploying. The skill's own fallback section covers environments that can't
 *  install it. */

/** Stands in for the visitor's landing-page arm wherever a real one isn't
 *  known yet — server render, and the docs page before hydration. */
const VARIANT_PLACEHOLDER = "<alpha|beta|gamma|delta>";

/** `EMBARKO_LP_VARIANT` rides along to the deploy service (the deploy script
 *  forwards it as the `lp_variant` header) so a deploy can be attributed back
 *  to the landing page that produced it. */
function build(variantLine: string): string {
  return `Deploy this app to Embarko and tell me the live URL when it is live.

Install the Embarko deploy skill and follow it:
npx skills add embarko-ai/skill --skill embarko-deploy -g
${variantLine}
The skill handles packaging, naming, the upload, build status and errors — follow it instead of calling the API yourself. No account or token is needed for a first deploy. If you cannot install it, the full reference is at https://embarko.ai/doc`;
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
 * Which arm the visitor is copying from, for attribution.
 *
 * The page wins over the cookie. A direct hit on /v1../v4 — QA, or a shared
 * link — shows a landing page that need not match the arm the visitor was
 * bucketed into, and the honest answer is the page the copy actually came
 * from. For everyone else the path is `/` or /doc, which says nothing, so the
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
