// Server-only BFF core for talking to hostnsoft-api.
//
// The browser never calls hostnsoft-api directly — it calls this Next.js app's
// /api/* routes, which forward here. That lets us keep the session server-side
// and sidestep cross-origin credential/CORS constraints entirely.
//
// The MSG91 proxy_auth_token (PAT) IS the session: hostnsoft-api no longer
// issues its own access/refresh tokens — every upstream request just carries
// the PAT in a `proxy_auth_token` header, verified (with caching) upstream.
// We keep the PAT in a single httpOnly cookie (hns_pat).

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const API_BASE = (process.env.HOSTNSOFT_API_URL ?? "http://localhost:4100").replace(/\/$/, "");

// MSG91 proxy-auth REST base. The proxy is the identity provider — a valid
// proxy_auth_token can be validated and turned into user details here without
// hostnsoft-api being involved (getDetails needs no secret authkey).
export const MSG91_BASE = (process.env.MSG91_ROUTES_BASE ?? "https://routes.msg91.com").replace(/\/$/, "");

export const PAT_COOKIE = "hns_pat"; // MSG91 proxy_auth_token — the login session

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

async function readProxyToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(PAT_COOKIE)?.value ?? null;
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
  proxyToken?: string | null;
  search?: string;
};

async function upstream(path: string, init: UpstreamInit): Promise<Response> {
  const headers: Record<string, string> = {};
  if (init.body != null) headers["Content-Type"] = "application/json";
  if (init.proxyToken) headers["proxy_auth_token"] = init.proxyToken;
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
      JSON.stringify({ error: "Can’t reach the Embarko API service right now." }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}

// Normalize an upstream Response into a NextResponse, passing status + JSON body
// through untouched.
async function toNextResponse(res: Response): Promise<NextResponse> {
  const text = await res.text();
  if (res.status === 204 || !text) {
    return new NextResponse(null, { status: res.status });
  }
  // Body may be JSON or (rarely) plain text; pass JSON through as JSON.
  try {
    return NextResponse.json(JSON.parse(text), { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}

// Generic authenticated proxy used by /api/hns/[...path] — attaches the PAT.
export async function proxy(
  path: string,
  opts: { method: string; body?: string | null; search?: string },
): Promise<NextResponse> {
  const proxyToken = await readProxyToken();
  if (!proxyToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const res = await upstream(path, {
    method: opts.method,
    body: opts.body,
    search: opts.search,
    proxyToken,
  });

  return toNextResponse(res);
}

// --- auth-specific helpers (cookie side effects live here) -------------------

// Log in with an MSG91 proxy_auth_token.
//
// The proxy is the identity provider, so login hinges on the proxy token — NOT
// on hostnsoft-api. We:
//   1. Persist the proxy token as the login session cookie (hns_pat).
//   2. Best-effort: verify it against hostnsoft-api (which also warms its
//      verification cache). If hostnsoft-api is down, we skip this and the
//      user is still logged in.
//   3. Resolve identity: prefer hostnsoft-api's user; otherwise fall back to
//      MSG91 getDetails.
// Login fails only if the token itself is invalid (neither hostnsoft-api nor
// MSG91 accepts it).
export async function exchange(token: string): Promise<NextResponse> {
  let user: Identity | null = null;
  let currentCompany: unknown = null;
  let apiConnected = false;
  let hostnsoftRejected = false;

  const res = await upstream("/auth/msg91/exchange", {
    method: "POST",
    body: JSON.stringify({ token }),
  });

  if (res.ok) {
    const data = await res.json().catch(() => null);
    if (data) {
      user = data.user ?? null;
      currentCompany = data.currentCompany ?? null;
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

  // The full company list comes from /auth/me on the next load.
  const out = NextResponse.json(
    { user, companies: [], currentCompany, apiConnected },
    { status: 200 },
  );
  out.cookies.set(PAT_COOKIE, token, cookieOpts(PAT_MAX_AGE));
  return out;
}

// hostnsoft-api's /auth/me returns a user-shaped payload with a `c_companies`
// array, not the `companies: CompanyMembershipSummary[]` shape the console
// expects. Reshape it here so the rest of the app only ever sees the
// normalized contract.
function normalizeMeResponse(data: Record<string, unknown>): Record<string, unknown> {
  const rawCompanies = Array.isArray(data.c_companies) ? data.c_companies : [];
  const companies = rawCompanies.map((c) => {
    const company = c as Record<string, unknown>;
    return {
      companyId: String(company.id),
      companyName: String(company.name),
    };
  });
  return { ...data, companies };
}

// Guard for internal-only routes. Resolves the caller from the login session,
// or null when there isn't a valid one. Identity is read straight from MSG91
// rather than hostnsoft-api, so the guard still works — and still refuses
// anonymous callers — on a deploy where the control plane is unreachable.
//
// ADMIN_EMAILS optionally narrows access to a comma-separated allowlist; left
// unset, any logged-in user passes. It is compared case-insensitively.
export async function currentUser(): Promise<Identity | null> {
  const proxyToken = await readProxyToken();
  if (!proxyToken) return null;

  const identity = await msg91GetDetails(proxyToken);
  if (!identity) return null;

  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length > 0 && !allowlist.includes(identity.email.toLowerCase())) {
    return null;
  }

  return identity;
}

// Who am I? Used at app boot. Identity comes from hostnsoft-api when reachable
// (so we also get companies), otherwise from the MSG91 proxy session — so the
// user stays logged in and in the app even when hostnsoft-api is down.
export async function me(): Promise<NextResponse> {
  const proxyToken = await readProxyToken();
  if (!proxyToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Prefer hostnsoft-api: full identity + companies.
  const res = await upstream("/auth/me", { proxyToken });
  if (res.ok) {
    const data = await res.json().catch(() => null);
    if (data) {
      const normalized = normalizeMeResponse(data);
      return NextResponse.json({ ...normalized, apiConnected: true }, { status: 200 });
    }
  }
  if (res.status === 401 || res.status === 403) {
    // hostnsoft-api (i.e. proxy) actively rejected the PAT — session over.
    const out = NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    out.cookies.delete(PAT_COOKIE);
    return out;
  }

  // hostnsoft-api unreachable — fall back to the MSG91 proxy identity
  // (logged in, but no company data).
  const user = await msg91GetDetails(proxyToken);
  if (user) {
    return NextResponse.json(
      { ...user, companies: [], apiConnected: false },
      { status: 200 },
    );
  }

  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

// Switch the active company for the current session (proxy-side).
export async function switchCompany(companyId: string): Promise<NextResponse> {
  const proxyToken = await readProxyToken();
  if (!proxyToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const res = await upstream("/auth/switch-company", {
    method: "POST",
    body: JSON.stringify({ companyId }),
    proxyToken,
  });

  return toNextResponse(res);
}

// Revoke the proxy session everywhere and clear the cookie.
export async function logout(): Promise<NextResponse> {
  const proxyToken = await readProxyToken();
  if (proxyToken) {
    // Lets hostnsoft-api evict its cached identity for this PAT.
    await upstream("/auth/logout", { method: "POST", proxyToken }).catch(() => { });
    await msg91Logout(proxyToken);
  }
  const out = new NextResponse(null, { status: 204 });
  out.cookies.delete(PAT_COOKIE);
  return out;
}
