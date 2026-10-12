import { guidesIndexLlmsText, LLMS_HEADERS } from "../../lib/guides";

/* /guides/llms.txt: the index of every guide for AI agents. Bundled content,
   so it is built once, like the docs' markdown routes. */
export const dynamic = "force-static";

export function GET() {
  return new Response(guidesIndexLlmsText(), { headers: LLMS_HEADERS });
}
