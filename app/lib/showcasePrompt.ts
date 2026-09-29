import { SITE, SITE_HOST } from "./site";

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
      ? `the Embarko Showcase event page "${page.title}" (${SITE_HOST}/showcase/${page.slug})`
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
 * The same prompt for the public Showcase itself, with no page chosen. The
 * API still needs a page slug, so the listing goes on the company's own page,
 * which every company has from signup and which feeds the public gallery.
 */
export function showcaseGeneralPrompt(): string {
  return `List this app on the Embarko Showcase (${SITE_HOST}/showcase).

If it isn't deployed to Embarko yet, deploy it first: read ${SITE}/docs/agent-quickstart.md and follow it.
Use my deploy token — DEPLOY_TOKEN or ~/.embarko/credentials if either is set; if neither is, ask me for one from ${SITE}/app/tokens.

Then list it: read ${SITE}/docs/api.md#showcase for how to call the Showcase API.
Use my workspace's own Showcase page as the page slug (ask me for it if you can't tell), and these details, inferring what you can from the project and asking me for the rest:
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
