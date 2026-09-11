import { readLpVariant } from "./gtm";
import { variantForPath } from "./variants";

/** The canonical "copy prompt for agent" text — shared by the landing page's
 *  hero CTA and the docs page's "Install the skill" panel so they never
 *  drift out of sync. */

/** Stands in for the visitor's landing-page arm wherever a real one isn't
 *  known yet — server render, and the docs page before hydration. */
const VARIANT_PLACEHOLDER = "<alpha|beta|gamma|delta>";

/** `header lp_variant: …` rides along to the deploy service so a deploy can be
 *  attributed back to the landing page that produced it. */
function build(variantHeader: string): string {
  return `Deploy this to Embarko: POST https://ship.embarko.ai/apps with
header Authorization: Bearer $DEPLOY_TOKEN, header X-App-Name: <name>${variantHeader},
and multipart field source=<tarball of the app>. Full docs:
https://embarko.ai/docs. (A helper skill exists too —
npx skills add embarko-ai/skill --skill embarko-deploy -g — but that's
optional convenience, not required; the curl call above works standalone.)`;
}

/** The documentation form: the arm header is shown, with its allowed values in
 *  place of a real one. Safe to render on the server — it depends on nothing
 *  request-specific, so it can't cause a hydration mismatch. */
export const DEPLOY_PROMPT = build(`, header lp_variant: ${VARIANT_PLACEHOLDER}`);

/**
 * The prompt as an agent should actually receive it, with the visitor's arm
 * filled in.
 *
 * With no arm known the header is dropped entirely rather than left as a
 * placeholder: an agent reading `lp_variant: <alpha|beta|gamma|delta>` would
 * send that string verbatim, which is worse than no attribution at all. That
 * happens whenever the cookie is missing — a visitor who reached /docs without
 * ever landing on `/`, or one who clears cookies.
 */
export function deployPromptFor(variant: string | null): string {
  return build(variant ? `, header lp_variant: ${variant}` : "");
}

/**
 * The console's form of the prompt: no landing-page header at all.
 *
 * The header exists to attribute a deploy to the landing page that produced it.
 * Inside the console the visitor is already a signed-in customer acting on
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
