import { rawFile, rawFileNames } from "../../lib/guide/site";
import { SITE } from "../../lib/site";

/**
 * The agent guide as raw Markdown and JSON. Never linked directly: middleware
 * rewrites the public addresses here, so this path is an implementation
 * detail.
 *
 *   /docs/quickstart.md, /docs/quickstart.json   one topic
 *   /docs/index.md, /docs.md, /docs/index.json   the contents page
 *   /docs/quickstart (agent Accept header)       same as quickstart.md
 *
 * It can't sit under app/docs/ itself: that segment is already [slug] for
 * the HTML pages, and Next allows one dynamic name per level.
 */

/* Bundled strings, no request-time IO, nothing user-specific. */
export const dynamic = "force-static";

export function generateStaticParams() {
  return rawFileNames().map((file) => ({ file }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const raw = rawFile(file);

  if (!raw) {
    return Response.json(
      {
        error: `No guide page called "${file}".`,
        code: "unknown_topic",
        next: "Open the contents page and pick a topic.",
        links: { contents: `${SITE}/docs/index.md` },
      },
      { status: 404 },
    );
  }

  return new Response(raw.body, {
    headers: {
      /* charset matters: the guide uses arrows and dashes, and a client that
         assumes latin-1 renders those as mojibake. */
      "content-type": raw.type,
      "cache-control": "public, max-age=300, stale-while-revalidate=86400",
      "access-control-allow-origin": "*",
      /* The same address answers HTML or Markdown by Accept header. */
      vary: "Accept",
      /* The HTML page is the one to index; this is its copy. The api-catalog
         link lets an agent that lands here find everything else. */
      link: [
        ...(raw.page ? [`<${raw.page}>; rel="canonical"`] : []),
        '</.well-known/api-catalog>; rel="api-catalog"',
        '</llms.txt>; rel="describedby"; type="text/plain"',
      ].join(", "),
    },
  });
}
