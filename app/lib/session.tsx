"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authExchange, authLogout, authMe, authSwitchCompany, markExchanged, wasExchanged } from "./client";
import { startEarlyReads } from "./earlyReads";
import { clearLastSeen, readLastSeen, writeLastSeen } from "./lastSeen";
import type { CompanyMembershipSummary, MeResponse } from "./types";

type Status = "loading" | "authed" | "anon";

interface SessionValue {
  status: Status;
  user: { id: string; email: string; name: string | null } | null;
  // True only for platform admins. Hides the admin entry point for everyone
  // else — the /admin pages and their APIs check server-side as well, so this
  // is presentation, not protection.
  isSuperAdmin: boolean;
  companies: CompanyMembershipSummary[];
  activeCompanyId: string | null;
  activeCompany: CompanyMembershipSummary | null;
  authError: string | null;
  // false when logged in via the MSG91 proxy but hostnsoft-api is unreachable.
  apiConnected: boolean;
  setActiveCompanyId: (id: string) => void;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

const ACTIVE_KEY = "hns.activeCompany";

function storedCompanyId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

// Map MSG91 / hostnsoft-api redirect error codes to human messages.
function authErrorMessage(code: string): string {
  switch (code) {
    case "invalid_token":
      return "That sign-in link was invalid or expired. Please try again.";
    default:
      return "Sign-in didn’t complete. Please try again.";
  }
}

// The MSG91 proxy-auth widget redirects back to our origin with the one-time
// proxy_auth_token appended to the URL (per the integration guide). Pull it off
// the URL, exchange it for a session via the BFF, then strip it from history so
// it never lingers in the address bar / logs. Returns true if a token was seen.
const TOKEN_KEYS = ["proxy_auth_token", "token", "access_token", "accessToken", "auth_token", "authToken"];

/* MSG91 also echoes the rest of what it knows about the session onto the same
   redirect. Nothing here reads any of it — the PAT cookie is the session — but
   user_ref_id and company_ref_id are real account identifiers, so they must not
   sit in the address bar, in history, or in the query string PageViewTracker
   reports. They come off with the token. */
const ECHO_KEYS = ["token_type", "expire_at", "user_ref_id", "company_ref_id", "is_new_user"];

const STRIP_KEYS = [...TOKEN_KEYS, ...ECHO_KEYS, "auth_error", "next"];

async function consumeRedirectToken(setAuthError: (m: string | null) => void): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  // The token may arrive in the query OR the URL fragment (fragments never
  // reach the server, so they don't show up in Next's logs).
  const hashParams = new URLSearchParams(
    url.hash.startsWith("#") ? url.hash.slice(1) : url.hash,
  );
  const pick = (k: string) => url.searchParams.get(k) ?? hashParams.get(k);

  let token: string | null = null;
  for (const k of TOKEN_KEYS) {
    const v = pick(k);
    if (v) { token = v; break; }
  }
  const errCode = url.searchParams.get("auth_error") ?? hashParams.get("auth_error");

  // Clean these params off the URL regardless of outcome. No-op unless at
  // least one is actually present, so an ordinary page load doesn't rewrite
  // history for nothing.
  const strip = () => {
    if (!STRIP_KEYS.some((k) => pick(k) !== null)) return;
    STRIP_KEYS.forEach((k) => {
      url.searchParams.delete(k);
      hashParams.delete(k);
    });
    const newHash = hashParams.toString();
    window.history.replaceState({}, "", url.pathname + url.search + (newHash ? `#${newHash}` : ""));
  };

  /* No token to exchange, but the echoed metadata can still be on the URL —
     a reload of an already-consumed redirect lands exactly here. */
  if (!token && !errCode) {
    strip();
    return false;
  }

  if (errCode) {
    setAuthError(authErrorMessage(errCode));
    strip();
    return false;
  }

  // If the success callback already spent this token, don't re-exchange it
  // (it's single-use) — just clear it from the URL; /auth/me will confirm.
  if (wasExchanged(token!)) {
    strip();
    return true;
  }

  markExchanged(token!);
  try {
    await authExchange(token!);
    strip();
    return true;
  } catch (e) {
    setAuthError(e instanceof Error ? e.message : "Sign-in failed. Please try again.");
    strip();
    return false;
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [activeCompanyId, setActiveState] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // First, if we just came back from the MSG91 redirect, turn the one-time
    // token into a session before asking who we are.
    const signingIn = await consumeRedirectToken(setAuthError);
    // Open on who was signed in last time instead of a spinner; /auth/me below
    // confirms or replaces it. Not straight after a sign-in, which may be
    // somebody else. See lastSeen.ts.
    const last = signingIn ? null : readLastSeen<MeResponse>("me");
    if (last) {
      setMe(last);
      setStatus("authed");
      setActiveState((prev) => {
        const stored = storedCompanyId();
        if (prev) return prev;
        if (stored && last.companies.some((c) => c.companyId === stored)) return stored;
        return last.companies[0]?.companyId ?? null;
      });
    }
    // Ask for the last-used workspace's data while /auth/me is still answering,
    // instead of after it. See earlyReads.ts.
    const lastCompanyId = storedCompanyId();
    if (lastCompanyId) startEarlyReads(lastCompanyId);
    try {
      // Identity comes from hostnsoft-api when up, else the MSG91 proxy session.
      const data = await authMe<MeResponse>();
      setMe(data);
      setStatus("authed");
      setAuthError(null);
      // Only a full answer is worth opening on next time; the MSG91 fallback
      // has no workspaces in it.
      if (data.apiConnected) writeLastSeen("me", data);
      setActiveState((prev) => {
        const stored = storedCompanyId();
        const ids = data.companies.map((c) => c.companyId);
        if (prev && ids.includes(prev)) return prev;
        if (stored && ids.includes(stored)) return stored;
        return data.companies[0]?.companyId ?? null;
      });
    } catch {
      clearLastSeen();
      setMe(null);
      setStatus("anon");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setActiveCompanyId = useCallback((id: string) => {
    setActiveState(id);
    try {
      window.localStorage.setItem(ACTIVE_KEY, id);
    } catch {
      // ignore storage failures — falls back to first company on next load
    }
    // Best-effort: tell hostnsoft-api which company is active. The UI has
    // already switched optimistically above.
    authSwitchCompany(id).catch(() => {});
  }, []);

  const signOut = useCallback(async () => {
    await authLogout();
    clearLastSeen();
    setMe(null);
    setStatus("anon");
    setActiveState(null);
    try {
      window.localStorage.removeItem(ACTIVE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const companies = me?.companies ?? [];
  const activeCompany = companies.find((c) => c.companyId === activeCompanyId) ?? null;

  const value: SessionValue = {
    status,
    user: me ? { id: me.id, email: me.email, name: me.name } : null,
    isSuperAdmin: me?.isSuperAdmin === true,
    companies,
    activeCompanyId,
    activeCompany,
    authError,
    apiConnected: me?.apiConnected ?? false,
    setActiveCompanyId,
    reload: load,
    signOut,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
