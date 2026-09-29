import { SITE, SITE_HOST } from "./site";
import type { ShowcaseListing } from "./types";

/**
 * The "list my app on Showcase" prompt, built the same way as deployPrompt.ts:
 * it states the intent, names the page, and points at the docs. It does not
 * restate endpoints — those live with the platform and would go stale in a
 * chat history.
 *
 * The listing fields are named because they are the one thing only the person
 * and their agent know; the agent fills them from the codebase and asks for
 * whatever it can't infer.
 */
export function showcaseListPrompt(
  page: { slug: string; title: string; type: "company" | "public" },
  /** Names the app so the agent lists this one, not whatever it guesses. */
  appSlug?: string | null,
): string {
  const where =
    page.type === "public"
      ? `the Embarko Showcase page "${page.title}" (${SITE_HOST}/showcase/${page.slug})`
      : `my workspace's Embarko Showcase page "${page.title}" (${SITE_HOST}/showcase/${page.slug})`;

  const which = appSlug ? `my Embarko app "${appSlug}"` : "this app";

  return `List ${which} on ${where}.

If it isn't deployed to Embarko yet, deploy it first: read ${SITE}/docs/agent-quickstart.md and follow it.
Use my deploy token — DEPLOY_TOKEN or ~/.embarko/credentials if either is set; if neither is, ask me for one from ${SITE}/app/tokens.

Then list it: read ${SITE}/docs/api.md#showcase for how to call the Showcase API with
page slug "${page.slug}" and these details, inferring what you can from the project and asking me for the rest:
- name and a one-line tagline
- what it does, and why it was built (a short paragraph each)
- creator name, and a profile link if I have one
- which AI built it (Claude, Codex, Cursor, Lovable, Replit, or other)
- a category (AI Tool, Personal, Business, Productivity, Education, Game, Developer Tool, Other) and a few tags
- a screenshot URL, and a video URL if there is one

When it's live, give me the link to its Showcase page.`;
}

/**
 * For an app that is already listed but has no screenshot, so the public page
 * leaves it out. Listing again through the agent API updates the listing
 * rather than erroring, so the prompt carries the details it was listed with:
 * the agent resends them unchanged and adds the one thing missing, instead of
 * asking the person to type them all over again.
 */
export function showcaseScreenshotPrompt(
  page: { slug: string; title: string; type: "company" | "public" },
  listing: Pick<
    ShowcaseListing,
    | "name"
    | "tagline"
    | "creatorName"
    | "creatorProfile"
    | "whatItDoes"
    | "whyBuilt"
    | "builtWith"
    | "category"
    | "tags"
    | "videoUrl"
  >,
  appSlug?: string | null,
): string {
  const where =
    page.type === "public"
      ? `the Embarko Showcase page "${page.title}" (${SITE_HOST}/showcase/${page.slug})`
      : `my workspace's Embarko Showcase page "${page.title}" (${SITE_HOST}/showcase/${page.slug})`;
  const which = appSlug ? `my Embarko app "${appSlug}"` : "this app";

  const details = [
    `- name: ${listing.name}`,
    `- tagline: ${listing.tagline}`,
    `- creator name: ${listing.creatorName}`,
    listing.creatorProfile && `- creator profile link: ${listing.creatorProfile}`,
    listing.whatItDoes && `- what it does: ${listing.whatItDoes}`,
    listing.whyBuilt && `- why it was built: ${listing.whyBuilt}`,
    listing.builtWith && `- built with: ${listing.builtWith}`,
    listing.category && `- category: ${listing.category}`,
    listing.tags?.length && `- tags: ${listing.tags.join(", ")}`,
    listing.videoUrl && `- video URL: ${listing.videoUrl}`,
  ].filter(Boolean);

  return `Add a screenshot to the listing for ${which} on ${where}.
It is listed there already, but without a screenshot it doesn't show on the page.

Use my deploy token — DEPLOY_TOKEN or ~/.embarko/credentials if either is set; if neither is, ask me for one from ${SITE}/app/tokens.

Read ${SITE}/docs/api.md#showcase: listing the app again on page slug "${page.slug}" updates its existing listing. Send these details unchanged, plus a screenshot URL — a public image of the app's main screen. If you can't make one, ask me for it.
${details.join("\n")}

When it's done, give me the link to its Showcase page.`;
}

/**
 * The same prompt for the public Showcase itself, with no page chosen. The
 * API still needs a page slug, so the listing goes on the company's own page,
 * which every company has from signup and which feeds the public gallery.
 */
/** `pageSlug`: the workspace's own page, when the caller knows it, so the agent needn't ask. */
export function showcaseGeneralPrompt(pageSlug?: string): string {
  return `List this app on the Embarko Showcase (${SITE_HOST}/showcase).

If it isn't deployed to Embarko yet, deploy it first: read ${SITE}/docs/agent-quickstart.md and follow it.
Use my deploy token — DEPLOY_TOKEN or ~/.embarko/credentials if either is set; if neither is, ask me for one from ${SITE}/app/tokens.

Then list it: read ${SITE}/docs/api.md#showcase for how to call the Showcase API.
${pageSlug ? `Use page slug "${pageSlug}" (my workspace's own Showcase page)` : "Use my workspace's own Showcase page as the page slug (ask me for it if you can't tell)"}, and these details, inferring what you can from the project and asking me for the rest:
- name and a one-line tagline
- what it does, and why it was built (a short paragraph each)
- creator name, and a profile link if I have one
- which AI built it (Claude, Codex, Cursor, Lovable, Replit, or other)
- a category (AI Tool, Personal, Business, Productivity, Education, Game, Developer Tool, Other) and a few tags
- a screenshot URL, and a video URL if there is one

When it's live, give me the link to its Showcase page.`;
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

When it's built, deploy it with Embarko: read ${SITE}/docs/agent-quickstart.md and follow it, then give me the live link.`;
}
