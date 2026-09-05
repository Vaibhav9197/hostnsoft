"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authExchange, authLogout, authMe, authSwitchCompany, markExchanged, wasExchanged } from "./client";
import type { CompanyMembershipSummary, MeResponse } from "./types";

type Status = "loading" | "authed" | "anon";

interface SessionValue {
  status: Status;
  user: { id: string; email: string; name: string | null } | null;
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

  if (!token && !errCode) return false;

  // Clean these params off the URL regardless of outcome.
  const strip = () => {
    [...TOKEN_KEYS, "auth_error", "next"].forEach((k) => {
      url.searchParams.delete(k);
      hashParams.delete(k);
    });
    const newHash = hashParams.toString();
    window.history.replaceState({}, "", url.pathname + url.search + (newHash ? `#${newHash}` : ""));
  };

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
    await consumeRedirectToken(setAuthError);
    try {
      // Identity comes from hostnsoft-api when up, else the MSG91 proxy session.
      const data = await authMe<MeResponse>();
      setMe(data);
      setStatus("authed");
      setAuthError(null);
      setActiveState((prev) => {
        const stored = typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_KEY) : null;
        const ids = data.companies.map((c) => c.companyId);
        if (prev && ids.includes(prev)) return prev;
        if (stored && ids.includes(stored)) return stored;
        return data.companies[0]?.companyId ?? null;
      });
    } catch {
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
