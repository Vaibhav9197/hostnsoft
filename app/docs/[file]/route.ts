import { docFileNames, docFileToSlug, docMarkdown } from "../../lib/docs";

/**
 * The published docs as raw markdown, at their page URL plus `.md`:
 *
 *   https://embarko.ai/docs/docs.md
 *   https://embarko.ai/docs/troubleshoot.md
 *   https://embarko.ai/docs/limitations.md
 *
 * This is the canonical location. /content/docs/*.md redirects here — see the
 * note in app/content/docs/[file]/route.ts for why there is only one.
 *
 * "page URL + .md" is the convention agent-facing docs sites have settled on,
 * and it means anyone holding a link to a doc can reach its source by typing
 * three characters rather than learning a second path shape.
 *
 * ROUTING NOTE
 * ------------
 * This dynamic segment sits alongside the static app/docs/troubleshoot/ and
 * app/docs/limitations/ page directories. Next resolves static segments before
 * dynamic ones, so /docs/troubleshoot still renders the HTML page and only
 * /docs/troubleshoot.md — which matches no static directory — falls through to
 * this handler. /docs itself is app/docs/page.tsx and is not affected either.
 *
 * Both spellings of a name resolve (see docFileToSlug): /docs/limitations.md
 * for the page URL, /docs/limitations-and-recommendations.md for the file's
 * real name, which is what cross-document links inside the markdown use.
 *
 * hackathons.md is reachable here too even though its page lives at
 * /hackathons, so every published doc has a markdown URL under one prefix.
 */

/* Bundled strings, no request-time IO, nothing user-specific. */
export const dynamic = "force-static";

export function generateStaticParams() {
  return docFileNames().map((file) => ({ file }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const slug = docFileToSlug(file);
  const markdown = slug === undefined ? undefined : docMarkdown(slug);

  if (markdown === undefined) {
    return new Response("Not found\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(markdown, {
    headers: {
      /* charset matters: the docs use en dashes and arrows throughout, and a
         client that assumes latin-1 renders those as mojibake. */
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
