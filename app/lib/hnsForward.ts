// The /api/hns/* proxy: forward a console request to hostnsoft-api with the
// session's PAT attached.
//
// Deliberately free of any Next.js import. It runs in two places:
//   - app/api/hns/[...path]/route.ts, which is what `next dev` serves, and
//   - worker.ts, which answers /api/hns/* in production before OpenNext loads
//     the Next server at all. That start-up was most of the ~150ms of Worker
//     CPU every API call paid for a proxy that only forwards a request.
// One implementation, so the two paths can't drift apart.

/** MSG91 proxy_auth_token — the login session. Same cookie as api.ts. */
export const PAT_COOKIE = "hns_pat";

/* How long to wait on hostnsoft-api before answering with a 502. Reads get
   5s: on the live Worker they finish in about a second even at P99, so 5s is
   generous, and a page stuck on a dead read is what someone sees as "frozen".
   Changes keep 10s: a write we give up on may still land upstream, and an
   error for something that actually happened is worse than a slow success. */
const READ_TIMEOUT_MS = 5_000;
const WRITE_TIMEOUT_MS = 10_000;

export function timeoutFor(method: string): number {
  return method.toUpperCase() === "GET" ? READ_TIMEOUT_MS : WRITE_TIMEOUT_MS;
}

/** Read one cookie off a raw Cookie header, decoded the way Next's cookies() does. */
export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    const raw = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function forwardToApi(opts: {
  apiBase: string;
  /** Path segments after /api/hns, already decoded. */
  segments: string[];
  /** Query string including its leading "?", or "". */
  search: string;
  method: string;
  body: string | null;
  proxyToken: string | null;
}): Promise<Response> {
  if (!opts.proxyToken) return json({ error: "Not authenticated" }, 401);

  const target = "/" + opts.segments.map(encodeURIComponent).join("/");
  const headers: Record<string, string> = { proxy_auth_token: opts.proxyToken };
  if (opts.body != null) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${opts.apiBase.replace(/\/$/, "")}${target}${opts.search}`, {
      method: opts.method,
      headers,
      body: opts.body ?? undefined,
      cache: "no-store",
      redirect: "manual",
      // Never let a slow/unreachable backend hang the request (and freeze the UI).
      signal: AbortSignal.timeout(timeoutFor(opts.method)),
    });
  } catch {
    // Network-level failure (backend down / unreachable): a clean 502 instead
    // of an unhandled 500.
    return json({ error: "Can’t reach the Embarko API service right now." }, 502);
  }

  // Status and body only. Upstream headers (Set-Cookie, Location on a 3xx…)
  // are dropped on purpose, exactly as the Next route always did.
  const text = await res.text();
  if (res.status === 204 || !text) return new Response(null, { status: res.status });
  try {
    JSON.parse(text);
    return new Response(text, { status: res.status, headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(text, { status: res.status, headers: { "Content-Type": "text/plain;charset=UTF-8" } });
  }
}

/** Methods the proxy answers. Anything else (OPTIONS, HEAD) is left to Next. */
export const FORWARDED_METHODS = new Set(["GET", "POST", "PATCH", "PUT", "DELETE"]);

/** Everything forwardToApi needs, read off a plain Request. */
export async function forwardRequest(request: Request, apiBase: string, segments: string[]): Promise<Response> {
  const method = request.method.toUpperCase();
  const body = method !== "GET" && method !== "DELETE" ? await request.text() : null;
  return forwardToApi({
    apiBase,
    segments,
    search: new URL(request.url).search,
    method,
    body: body || null,
    proxyToken: readCookie(request.headers.get("cookie"), PAT_COOKIE),
  });
}
