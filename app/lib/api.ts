// Server-only BFF core for talking to hostnsoft-api.
//
// The browser never calls hostnsoft-api directly — it calls this Next.js app's
// /api/* routes, which forward here. That lets us keep the session server-side
// and sidestep cross-origin credential/CORS constraints entirely:
//
//   • the short-lived access token is stored in an httpOnly cookie (hns_at)
//   • hostnsoft-api's own httpOnly refresh cookie is captured verbatim and
//     stored in another httpOnly cookie (hns_rt), then replayed upstream on
//     every call so refresh/rotate keep working
//
// On a 401 from an expired access token, the proxy transparently calls
// /auth/refresh once, updates the cookies, and retries the original request.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const API_BASE = (process.env.HOSTNSOFT_API_URL ?? "http://localhost:4100").replace(/\/$/, "");

// MSG91 proxy-auth REST base. The proxy is the identity provider — a valid
// proxy_auth_token can be validated and turned into user details here without
// hostnsoft-api being involved (getDetails needs no secret authkey).
export const MSG91_BASE = (process.env.MSG91_ROUTES_BASE ?? "https://routes.msg91.com").replace(/\/$/, "");

export const AT_COOKIE = "hns_at"; // hostnsoft access token (JWT), ~15 min
export const RT_COOKIE = "hns_rt"; // hostnsoft refresh cookie pair(s), verbatim
export const PAT_COOKIE = "hns_pat"; // MSG91 proxy_auth_token — the login session

const AT_MAX_AGE = 15 * 60; // 15 minutes
const RT_MAX_AGE = 30 * 24 * 60 * 60; // 30 days
const PAT_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

// Collapse an upstream Set-Cookie list into a single Cookie header value we can
// replay. We only care about the name=value pairs, not the attributes.
export function pairsFromSetCookie(setCookies: string[]): string {
  return setCookies
    .map((c) => c.split(";", 1)[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

async function readTokens() {
  const jar = await cookies();
  return {
    accessToken: jar.get(AT_COOKIE)?.value ?? null,
    refreshCookie: jar.get(RT_COOKIE)?.value ?? null,
    proxyToken: jar.get(PAT_COOKIE)?.value ?? null,
  };
}

type Identity = { id: string; email: string; name: string | null };

// Validate a proxy_auth_token and pull the user's details straight from MSG91.
// This is what lets login succeed even when hostnsoft-api is unreachable:
// if this returns a user, the token is valid and we know who they are.
async function msg91GetDetails(proxyToken: string): Promise<Identity | null> {
  try {
    const res = await fetch(`${MSG91_BASE}/api/c/getDetails`, {
      headers: { proxy_auth_token: proxyToken },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const raw = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!raw) return null;
    // MSG91 can return HTTP 200 with an error envelope — treat that as failure.
    if (raw.hasError === true || raw.status === "error") return null;
    // MSG91 getDetails returns { data: [ { id, name, email, ... } ] } — data is
    // an ARRAY. Take the first entry. Fall back to a few other shapes.
    const container = raw.data ?? raw.user ?? raw;
    const u = (Array.isArray(container) ? container[0] : container) as Record<string, unknown> & {
      id?: unknown; _id?: unknown; userId?: unknown;
      email?: unknown; emailId?: unknown; mobile?: unknown; username?: unknown;
      name?: unknown; fullName?: unknown;
    };
    if (!u || typeof u !== "object") return null;
    const realId = u.id ?? u._id ?? u.userId ?? null;
    const email = u.email ?? u.emailId ?? u.mobile ?? u.username ?? "";
    const name = u.name ?? u.fullName ?? u.username ?? null;
    // A valid identity must have at least an id or an email; otherwise the token
    // wasn't really accepted and we must not treat it as a login.
    if (!realId && !email) return null;
    return {
      id: String(realId ?? email),
      email: String(email),
      name: name != null ? String(name) : null,
    };
  } catch {
    return null;
  }
}

// Best-effort MSG91 logout for a proxy token.
async function msg91Logout(proxyToken: string): Promise<void> {
  try {
    await fetch(`${MSG91_BASE}/api/c/logout`, {
      method: "DELETE",
      headers: { proxy_auth_token: proxyToken },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // ignore — cookie is cleared regardless
  }
}

type UpstreamInit = {
  method?: string;
  body?: string | null;
  accessToken?: string | null;
  refreshCookie?: string | null;
  search?: string;
};

async function upstream(path: string, init: UpstreamInit): Promise<Response> {
  const headers: Record<string, string> = {};
  if (init.body != null) headers["Content-Type"] = "application/json";
  if (init.accessToken) headers["Authorization"] = `Bearer ${init.accessToken}`;
  if (init.refreshCookie) headers["Cookie"] = init.refreshCookie;
  try {
    return await fetch(`${API_BASE}${path}${init.search ?? ""}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body ?? undefined,
      cache: "no-store",
      redirect: "manual",
      // Never let a slow/unreachable backend hang the request (and freeze the UI).
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Network-level failure (backend down / unreachable). Surface as a clean
    // 502 the callers can pass through, instead of an unhandled 500.
    return new Response(
      JSON.stringify({ error: "Can’t reach the hostnsoft-api service right now." }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}

// Refresh the access token using the stored upstream refresh cookie.
// Returns the new access token + any rotated refresh cookie, or null on failure.
async function refresh(refreshCookie: string): Promise<{ accessToken: string; refreshCookie: string } | null> {
  const res = await upstream("/auth/refresh", { method: "POST", refreshCookie });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as { accessToken?: string } | null;
  if (!data?.accessToken) return null;
  const rotated = pairsFromSetCookie(res.headers.getSetCookie());
  return { accessToken: data.accessToken, refreshCookie: rotated || refreshCookie };
}

// Exchange an MSG91 proxy_auth_token with hostnsoft-api for a data session
// (access token + refresh cookie), WITHOUT the identity/company payload. Used to
// lazily establish a hostnsoft session when the user logged in via the proxy
// while the backend was down. Returns null if the backend is unreachable or the
// token isn't accepted.
async function hostnsoftExchangeTokens(
  proxyToken: string,
): Promise<{ accessToken: string; refreshCookie: string } | null> {
  const res = await upstream("/auth/msg91/exchange", {
    method: "POST",
    body: JSON.stringify({ token: proxyToken }),
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as { token?: string } | null;
  if (!data?.token) return null;
  const refreshCookie = pairsFromSetCookie(res.headers.getSetCookie());
  return { accessToken: data.token, refreshCookie: refreshCookie || "" };
}

// Normalize an upstream Response into a NextResponse, passing status + JSON body
// through untouched, and applying any refreshed session cookies.
async function toNextResponse(
  res: Response,
  refreshed?: { accessToken: string; refreshCookie: string } | null,
): Promise<NextResponse> {
  const text = await res.text();
  let out: NextResponse;
  if (res.status === 204 || !text) {
    out = new NextResponse(null, { status: res.status });
  } else {
    // Body may be JSON or (rarely) plain text; pass JSON through as JSON.
    try {
      out = NextResponse.json(JSON.parse(text), { status: res.status });
    } catch {
      out = new NextResponse(text, { status: res.status });
    }
  }
  if (refreshed) {
    out.cookies.set(AT_COOKIE, refreshed.accessToken, cookieOpts(AT_MAX_AGE));
    out.cookies.set(RT_COOKIE, refreshed.refreshCookie, cookieOpts(RT_MAX_AGE));
  }
  return out;
}

// Generic authenticated proxy used by /api/hns/[...path]. Handles the
// refresh-once-on-401 dance and cookie replay.
export async function proxy(
  path: string,
  opts: { method: string; body?: string | null; search?: string },
): Promise<NextResponse> {
  const tokens = await readTokens();
  let accessToken = tokens.accessToken;
  let refreshCookie = tokens.refreshCookie;
  const proxyToken = tokens.proxyToken;

  // Lazily mint a hostnsoft session from the proxy session if we don't have one
  // yet (e.g. the user logged in via the proxy while the backend was down).
  // `minted` cookies are written onto whatever response we return.
  let minted: { accessToken: string; refreshCookie: string } | null = null;
  if (!accessToken && !refreshCookie && proxyToken) {
    minted = await hostnsoftExchangeTokens(proxyToken);
    if (minted) {
      accessToken = minted.accessToken;
      refreshCookie = minted.refreshCookie || null;
    }
  }

  let res = await upstream(path, {
    method: opts.method,
    body: opts.body,
    search: opts.search,
    accessToken,
    refreshCookie,
  });

  if (res.status === 401 && refreshCookie) {
    const refreshed = await refresh(refreshCookie);
    if (refreshed) {
      res = await upstream(path, {
        method: opts.method,
        body: opts.body,
        search: opts.search,
        accessToken: refreshed.accessToken,
        refreshCookie: refreshed.refreshCookie,
      });
      return toNextResponse(res, refreshed);
    }
  }

  return toNextResponse(res, minted);
}

// --- auth-specific helpers (cookie side effects live here) -------------------

// Log in with an MSG91 proxy_auth_token.
//
// The proxy is the identity provider, so login hinges on the proxy token — NOT
// on hostnsoft-api. We:
//   1. Persist the proxy token as the login session cookie (hns_pat).
//   2. Best-effort: exchange it with hostnsoft-api for its data session
//      (access token + refresh cookie). If hostnsoft-api is down, we skip this
//      and the user is still logged in.
//   3. Resolve identity: prefer hostnsoft-api's user/companies; otherwise fall
//      back to MSG91 getDetails.
// Login fails only if the token itself is invalid (neither hostnsoft-api nor
// MSG91 accepts it).
export async function exchange(token: string): Promise<NextResponse> {
  let user: Identity | null = null;
  let companies: unknown[] = [];
  let apiConnected = false;
  let apiRefreshCookie: string | null = null;
  let apiAccessToken: string | null = null;
  let hostnsoftRejected = false;

  const res = await upstream("/auth/msg91/exchange", {
    method: "POST",
    body: JSON.stringify({ token }),
  });

  if (res.ok) {
    const data = await res.json().catch(() => null);
    if (data) {
      user = data.user ?? null;
      companies = data.companies ?? [];
      apiAccessToken = data.token ?? null;
      apiRefreshCookie = pairsFromSetCookie(res.headers.getSetCookie()) || null;
      apiConnected = true;
    }
  } else if (res.status !== 502) {
    // 400/401 from hostnsoft-api means it actively rejected the token.
    hostnsoftRejected = true;
  }
  // res.status === 502 => hostnsoft-api unreachable; fall through to MSG91.

  // Resolve identity from MSG91 if hostnsoft-api didn't give us one.
  if (!user) {
    user = await msg91GetDetails(token);
  }

  if (!user) {
    // Neither backend accepts this token — a real auth failure.
    const status = hostnsoftRejected ? 401 : 502;
    const error = hostnsoftRejected
      ? "That sign-in couldn’t be verified. Please try again."
      : "Can’t verify sign-in right now — please try again shortly.";
    return NextResponse.json({ error }, { status });
  }

  const out = NextResponse.json({ user, companies, apiConnected }, { status: 200 });
  out.cookies.set(PAT_COOKIE, token, cookieOpts(PAT_MAX_AGE));
  if (apiAccessToken) out.cookies.set(AT_COOKIE, apiAccessToken, cookieOpts(AT_MAX_AGE));
  if (apiRefreshCookie) out.cookies.set(RT_COOKIE, apiRefreshCookie, cookieOpts(RT_MAX_AGE));
  return out;
}

// Who am I? Used at app boot. Identity comes from hostnsoft-api when reachable
// (so we also get companies), otherwise from the MSG91 proxy session — so the
// user stays logged in and in the app even when hostnsoft-api is down.
export async function me(): Promise<NextResponse> {
  const tokens = await readTokens();
  let accessToken = tokens.accessToken;
  let refreshCookie = tokens.refreshCookie;
  const proxyToken = tokens.proxyToken;

  // If we have no hostnsoft session but do have a proxy session, mint one so we
  // can load companies once the backend is reachable.
  let minted: { accessToken: string; refreshCookie: string } | null = null;
  if (!accessToken && !refreshCookie && proxyToken) {
    minted = await hostnsoftExchangeTokens(proxyToken);
    if (minted) {
      accessToken = minted.accessToken;
      refreshCookie = minted.refreshCookie || null;
    }
  }

  // Prefer hostnsoft-api: full identity + companies.
  if (refreshCookie || accessToken) {
    let res = await upstream("/auth/me", { accessToken, refreshCookie });
    let refreshed: { accessToken: string; refreshCookie: string } | null = null;
    if (res.status === 401 && refreshCookie) {
      refreshed = await refresh(refreshCookie);
      if (refreshed) {
        res = await upstream("/auth/me", {
          accessToken: refreshed.accessToken,
          refreshCookie: refreshed.refreshCookie,
        });
      }
    }
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data) {
        const out = NextResponse.json({ ...data, apiConnected: true }, { status: 200 });
        const session = refreshed ?? minted;
        if (session) {
          out.cookies.set(AT_COOKIE, session.accessToken, cookieOpts(AT_MAX_AGE));
          out.cookies.set(RT_COOKIE, session.refreshCookie, cookieOpts(RT_MAX_AGE));
        }
        return out;
      }
    }
    // hostnsoft-api unreachable or session invalid — fall through to proxy.
  }

  // Fall back to the MSG91 proxy identity (logged in, but no company data).
  if (proxyToken) {
    const user = await msg91GetDetails(proxyToken);
    if (user) {
      return NextResponse.json(
        { ...user, companies: [], apiConnected: false },
        { status: 200 },
      );
    }
  }

  const out = NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return out;
}

// Proactively refresh the hostnsoft-api session. Returns 401 if it's over.
export async function refreshSession(): Promise<NextResponse> {
  const { refreshCookie } = await readTokens();
  if (!refreshCookie) return NextResponse.json({ error: "No session" }, { status: 401 });
  const refreshed = await refresh(refreshCookie);
  if (!refreshed) {
    const out = NextResponse.json({ error: "Session expired" }, { status: 401 });
    out.cookies.delete(AT_COOKIE);
    out.cookies.delete(RT_COOKIE);
    return out;
  }
  const out = NextResponse.json({ ok: true }, { status: 200 });
  out.cookies.set(AT_COOKIE, refreshed.accessToken, cookieOpts(AT_MAX_AGE));
  out.cookies.set(RT_COOKIE, refreshed.refreshCookie, cookieOpts(RT_MAX_AGE));
  return out;
}

// Revoke sessions everywhere and clear all local cookies.
export async function logout(): Promise<NextResponse> {
  const { refreshCookie, proxyToken } = await readTokens();
  if (refreshCookie) {
    await upstream("/auth/logout", { method: "POST", refreshCookie }).catch(() => {});
  }
  if (proxyToken) await msg91Logout(proxyToken);
  const out = new NextResponse(null, { status: 204 });
  out.cookies.delete(AT_COOKIE);
  out.cookies.delete(RT_COOKIE);
  out.cookies.delete(PAT_COOKIE);
  return out;
}
