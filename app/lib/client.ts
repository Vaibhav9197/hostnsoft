"use client";

// Client-side helper for calling the BFF proxy. Every console screen goes
// through this so error handling and the JSON contract stay in one place.

export class HnsError extends Error {
  status: number;
  details?: { path: string; message: string }[];
  constructor(message: string, status: number, details?: { path: string; message: string }[]) {
    super(message);
    this.name = "HnsError";
    this.status = status;
    this.details = details;
  }
}

type HnsInit = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
};

// Calls /api/hns/<path>. `path` should start with "/".
// Returns parsed JSON, or null for 204 responses. Throws HnsError on failure.
export async function hns<T = unknown>(path: string, init: HnsInit = {}): Promise<T> {
  const hasBody = init.body !== undefined;
  const res = await fetch(`/api/hns${path}`, {
    method: init.method ?? "GET",
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(init.body) : undefined,
    signal: init.signal,
  });

  if (res.status === 204) return null as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (data && typeof data.error === "string" && data.error) ||
      messageForStatus(res.status);
    throw new HnsError(message, res.status, data?.details);
  }
  return data as T;
}

function messageForStatus(status: number): string {
  switch (status) {
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "You don’t have permission to do that.";
    case 404:
      return "Not found.";
    case 409:
      return "That conflicts with something that already exists.";
    default:
      return "Something went wrong. Please try again.";
  }
}

// MSG91 proxy tokens are single-use, but the widget can hand us the same token
// via BOTH its success callback and its redirect. Dedupe so we only ever spend
// a given token once per tab (sessionStorage survives the redirect navigation).
const EXCHANGED_KEY = "hns.exchangedToken";
export function wasExchanged(token: string): boolean {
  try {
    return sessionStorage.getItem(EXCHANGED_KEY) === token;
  } catch {
    return false;
  }
}
export function markExchanged(token: string): void {
  try {
    sessionStorage.setItem(EXCHANGED_KEY, token);
  } catch {
    // ignore — worst case a duplicate exchange is attempted and no-ops
  }
}

// Auth endpoints live outside the generic proxy (they manage cookies).
export async function authExchange(token: string): Promise<{ user: unknown; companies: unknown[]; apiConnected?: boolean }> {
  const res = await fetch("/api/auth/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new HnsError(data?.error ?? "Login failed", res.status, data?.details);
  return data;
}

// Current identity (hostnsoft-api when up, else the MSG91 proxy session).
export async function authMe<T = unknown>(): Promise<T> {
  const res = await fetch("/api/auth/me");
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new HnsError(data?.error ?? "Not authenticated", res.status);
  return data as T;
}

export async function authLogout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
}

// Switch the active company for the current session.
export async function authSwitchCompany(companyId: string): Promise<void> {
  const res = await fetch("/api/auth/switch-company", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyId }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new HnsError(data?.error ?? "Couldn’t switch company", res.status, data?.details);
}
