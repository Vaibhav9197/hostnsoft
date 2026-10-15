import { guideLlmsText, LLMS_HEADERS, POSTS, postBySlug } from "../../../lib/guides";

/* /guides/<slug>/llms.txt: one guide as plain markdown for AI agents. */
export const dynamic = "force-static";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const post = postBySlug((await params).slug);
  if (!post) {
    return new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  return new Response(guideLlmsText(post), { headers: LLMS_HEADERS });
}
