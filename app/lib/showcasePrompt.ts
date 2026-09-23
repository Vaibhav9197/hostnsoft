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
      ? `the Embarko Showcase event page "${page.title}" (embarko.ai/showcase/${page.slug})`
      : `my company's Embarko Showcase page "${page.title}" (embarko.ai/showcase/${page.slug})`;

  const which = appSlug ? `my Embarko app "${appSlug}"` : "this app";

  return `List ${which} on ${where}.

If it isn't deployed to Embarko yet, deploy it first: read https://embarko.ai/docs/agent-quickstart.md and follow it.
Use my deploy token — DEPLOY_TOKEN or ~/.embarko/credentials if either is set; if neither is, ask me for one from https://embarko.ai/app/tokens.

Then list it: read https://embarko.ai/docs/api.md#showcase for how to call the Showcase API with
page slug "${page.slug}" and these details, inferring what you can from the project and asking me for the rest:
- name and a one-line tagline
- what it does, and why it was built (a short paragraph each)
- creator name, and a profile link if I have one
- which AI built it (Claude, Codex, Cursor, Lovable, Replit, or other)
- a category (AI Tool, Personal, Business, Productivity, Education, Game, Developer Tool, Other) and a few tags
- a screenshot URL, and a video URL if there is one

When it's live, give me the link to its Showcase page.`;
}
