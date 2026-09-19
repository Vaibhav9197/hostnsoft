import { permanentRedirect } from "next/navigation";

import { DOCS, docFileToSlug } from "../../../lib/docs";

/**
 * The repo-shaped markdown path, kept working as a redirect.
 *
 *   /content/docs/docs.md  ->  /docs/docs.md
 *
 * This path exists because it mirrors where the files sit in the repository,
 * which is the first thing anyone guesses. It is NOT the canonical URL: the
 * canonical one is the page URL plus `.md`, served by app/docs/[file]/route.ts.
 *
 * Why one canonical and not two live copies: the same reason next.config.mjs
 * redirects www to the apex. Two URLs serving identical bytes is a duplicate
 * document — it splits caching, and anything that links or indexes docs has to
 * pick one arbitrarily. A 308 keeps every existing link working while leaving
 * exactly one address that is the document.
 *
 * 308 rather than 301/302 because it is the permanent redirect that is
 * guaranteed not to rewrite the method, which matters for a URL that tooling
 * may HEAD as well as GET.
 */

export const dynamic = "force-static";

export function generateStaticParams() {
  return DOCS.map((doc) => ({ file: `${doc.slug}.md` }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;

  /* Resolve before redirecting: a name we do not publish should 404 here
     rather than bounce the caller to a /docs URL that also 404s. */
  if (docFileToSlug(file) === undefined) {
    return new Response("Not found\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  permanentRedirect(`/docs/${file}`);
}
