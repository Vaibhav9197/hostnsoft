/**
 * Every discovery file (llms.txt, agent.json, OpenAPI...) is answered the same
 * way: open to any origin, cached briefly, and pointing at the API catalog so
 * an agent that lands on any one of them can find the rest (RFC 8288 + 9727).
 */
export function discoveryResponse(body: unknown, type: string): Response {
  const text = typeof body === "string" ? body : JSON.stringify(body, null, 2);
  return new Response(text, {
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=300, stale-while-revalidate=86400",
      "access-control-allow-origin": "*",
      link: '</.well-known/api-catalog>; rel="api-catalog", </llms.txt>; rel="describedby"; type="text/plain"',
    },
  });
}

export const JSON_TYPE = "application/json; charset=utf-8";
export const MD_TYPE = "text/markdown; charset=utf-8";
export const TEXT_TYPE = "text/plain; charset=utf-8";
