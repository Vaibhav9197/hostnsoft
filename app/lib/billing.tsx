"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { billingApi } from "./hnsApi";
import { useSession } from "./session";
import type { BillingPlan, BillingSubscription } from "./types";

// The company's billing status, loaded once per active company and shared by
// the header plan badge and the Billing page — so an upgrade on the page is
// reflected in the header without a second fetch or a reload.

// Mirrors FREE_PLAN_CODE in hostnsoft-api (billingUtility.ts). A zero-price
// plan is treated as free too, so a rename upstream degrades gracefully.
const FREE_PLAN_CODE = "embarko_free";

interface BillingValue {
  error: string | null;
  // "unknown" while loading; "none" = billing not set up for this company
  // (empty subscription list); "ready" otherwise.
  setup: "unknown" | "none" | "ready";
  active: BillingSubscription | null;
  pending: BillingSubscription | null;
  plans: BillingPlan[];
  // Display name of the plan in force. "Free" when billing isn't set up (a
  // company with no subscription is on the free tier by definition).
  planName: string | null;
  // True when there's nothing to cancel and an upgrade is the next step —
  // the single definition every consumer should use.
  isFree: boolean;
  reload: () => Promise<void>;
}

const BillingContext = createContext<BillingValue | null>(null);

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { status, activeCompanyId, apiConnected } = useSession();
  const [subs, setSubs] = useState<BillingSubscription[] | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const enabled = status === "authed" && !!activeCompanyId && apiConnected;

  // Status is per company and changes with every mutation.
  const reload = useCallback(async () => {
    if (!enabled || !activeCompanyId) return;
    setSubs(null);
    setError(null);
    try {
      const res = await billingApi.status(activeCompanyId);
      setSubs(res.subscriptions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load billing.");
    }
  }, [enabled, activeCompanyId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // The plan catalogue is org-wide and static; fetch it once per session.
  // Best-effort: status responses embed each subscription's plan anyway.
  useEffect(() => {
    if (!enabled || plans.length > 0) return;
    billingApi.plans().then(setPlans, () => {});
  }, [enabled, plans.length]);

  const value = useMemo<BillingValue>(() => {
    const active = subs?.find((s) => s.status === "active") ?? null;
    const pending = subs?.find((s) => s.status === "pending") ?? null;
    const setup = subs == null ? "unknown" : subs.length === 0 ? "none" : "ready";
    return {
      error,
      setup,
      active,
      pending,
      plans,
      planName: setup === "none" ? "Free" : active ? active.plan?.name ?? active.plan_code : null,
      isFree: !active || active.plan_code === FREE_PLAN_CODE || active.plan?.amount_cents === 0,
      reload,
    };
  }, [subs, plans, error, reload]);

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling(): BillingValue {
  const ctx = useContext(BillingContext);
  if (!ctx) throw new Error("useBilling must be used inside <BillingProvider>");
  return ctx;
}
