import { SITE, SITE_HOST } from "./site";
import type { ShowcaseListing } from "./types";

/* The shared body of every "list my app" prompt. It names where, then hands
   the agent to the docs: deploying is the quickstart's job, listing is the
   showcase capability's (which owns the fields, the flow and the approval
   rules), so nothing here can go stale in a chat history. */
const SHOWCASE_STEPS = `If it isn't deployed to Embarko yet, deploy it first.
Read ${SITE}/docs/quickstart.md and follow it.
Then list it: read ${SITE}/docs/showcase.md
Faster, if your tools let you install one: npx skills add embarko-ai/skill --skill embarko-deploy -g`;

/**
 * The "list my app on Showcase" prompt for one page: the public gallery, or
 * an event page by name and address.
 */
export function showcaseListPrompt(
  page: { slug: string; title: string; type: "public" | "event" },
  /** Names the app so the agent lists this one, not whatever it guesses. */
  appSlug?: string | null,
  /** The event's submit code — only when the organiser chose to share it. */
  code?: string | null,
): string {
  const which = appSlug ? `my Embarko app "${appSlug}"` : "this app";
  const where =
    page.type === "event"
      ? `the Embarko Showcase page "${page.title}" (${SITE_HOST}/showcase/${page.slug})`
      : `the Embarko Showcase (${SITE_HOST}/showcase)`;
  // The opt-in on the event's manage page: with it the listing skips review.
  const withCode = page.type === "event" && code ? `\nUse code "${code}" so it goes on the page at once.` : "";

  return `List ${which} on ${where}.${withCode}
${SHOWCASE_STEPS}`;
}


/** The same prompt for the public gallery, from pages that aren't one Showcase page. */
export function showcaseGeneralPrompt(): string {
  return `List this app on the Embarko Showcase (${SITE_HOST}/showcase).
${SHOWCASE_STEPS}`;
}

/**
 * "Build similar app": a prompt that hands the agent the original app's PRD,
 * so the visitor gets their own version, deployed on Embarko.
 */
export function buildSimilarPrompt(app: { name: string; appUrl: string; prd: string }): string {
  return `Build me an app similar to ${app.name} (${app.appUrl}), following this PRD. Adapt anything that's specific to the original, and ask me before changing the core idea.

--- PRD ---
${app.prd.trim()}
--- end PRD ---

When it's built, deploy it with Embarko: read ${SITE}/docs/quickstart.md and follow it, then give me the live link.`;
}
