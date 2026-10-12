"use client";

import { useState } from "react";
import { AlertTriangle, Tag as TagIcon } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { HnsError } from "../../lib/client";
import { formatDateUTC, formatMoney } from "../../lib/format";
import { billingApi } from "../../lib/hnsApi";
import type { BillingPlan, CouponBlocker, CouponCheck, CouponSummary, CouponWarning } from "../../lib/types";
import { cn } from "../../lib/utils";

/**
 * Check-then-apply coupon input. Nothing is applied until the user says so:
 * a one-time coupon is consumed by the very next invoice, so they get to see
 * what a code does first.
 *
 * Lives above the plan cards. After a check the parent learns the result
 * (`onChange`) and narrows the plans to the ones the coupon covers; the
 * upgrade then carries the code. `allowApply` shows an Apply button for
 * coupons that already fit the current paid plan.
 */
export type CouponBoxState =
  | { kind: "idle"; code: string }
  | { kind: "checking"; code: string }
  | { kind: "checked"; code: string; check: CouponCheck }
  | { kind: "blocked"; code: string; check: CouponCheck }
  | { kind: "failed"; code: string; message: string }
  | { kind: "applying"; code: string; check: CouponCheck };

export function CouponBox({
  companyId,
  plans,
  allowApply,
  onApplied,
  onChange,
}: {
  companyId: string;
  /** Known plans, for naming plan-limited coupons' plans. */
  plans: BillingPlan[];
  /** Show "Apply coupon" for the current plan (paid plan the coupon covers). */
  allowApply: boolean;
  onApplied?: () => void;
  onChange?: (state: CouponBoxState) => void;
}) {
  const [state, setStateRaw] = useState<CouponBoxState>({ kind: "idle", code: "" });
  const setState = (s: CouponBoxState) => {
    setStateRaw(s);
    onChange?.(s);
  };

  const code = state.code;
  const busy = state.kind === "checking" || state.kind === "applying";

  async function runCheck() {
    const trimmed = code.trim();
    if (!trimmed) return;
    setState({ kind: "checking", code: trimmed });
    try {
      const result = await billingApi.checkCoupon(companyId, trimmed);
      setState({ kind: result.applicable ? "checked" : "blocked", code: trimmed, check: result });
    } catch (e) {
      setState({ kind: "failed", code: trimmed, message: couponErrorMessage(e) });
    }
  }

  async function apply() {
    if (state.kind !== "checked") return;
    setState({ kind: "applying", code: state.code, check: state.check });
    try {
      await billingApi.applyCoupon(companyId, state.code);
      setState({ kind: "idle", code: "" });
      onApplied?.();
    } catch (e) {
      setState({ kind: "failed", code: state.code, message: couponErrorMessage(e) });
    }
  }

  const planName = (c: string) => plans.find((p) => p.code === c)?.name ?? c;
  const check = state.kind === "checked" || state.kind === "blocked" || state.kind === "applying" ? state.check : null;

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!busy) runCheck();
        }}
      >
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-foreground">
          Coupon code
          <Input
            value={code}
            onChange={(e) => setState({ kind: "idle", code: e.target.value })}
            placeholder="Enter code"
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            className="font-mono uppercase"
          />
        </label>
        <div className="flex gap-2">
          <Button type="submit" variant="outline" disabled={busy || !code.trim()}>
            {state.kind === "checking" ? "Checking…" : "Check"}
          </Button>
          {code && !busy && (
            <Button type="button" variant="ghost" onClick={() => setState({ kind: "idle", code: "" })}>
              Clear
            </Button>
          )}
        </div>
      </form>

      <div role="status" aria-live="polite" className="empty:hidden">
        {state.kind === "failed" && (
          <p className="text-sm text-destructive">
            {state.message}{" "}
            <button type="button" className="underline" onClick={runCheck}>Retry</button>
          </p>
        )}

        {check && (
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-border px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <TagIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{check.coupon.name}</p>
                <p className="text-sm text-muted-foreground">
                  {describeCoupon(check.coupon)}
                  {check.coupon.planCodes && <> · {check.coupon.planCodes.map(planName).join(", ")} only</>}
                  {check.coupon.expiresAt && <> · Valid through {formatDateUTC(check.coupon.expiresAt)}</>}
                </p>
              </div>
            </div>

            {state.kind === "blocked" ? (
              <Notice tone="err">{blockerText(check.blockers[0])}</Notice>
            ) : allowApply ? (
              <Button type="button" size="sm" onClick={apply} disabled={busy}>
                {state.kind === "applying" ? "Applying…" : "Apply to current plan"}
              </Button>
            ) : (
              <Notice tone={check.warnings.length ? "warn" : "ok"}>
                {check.warnings.length
                  ? warningText(check.warnings[0], check.coupon, planName)
                  : "Pick a plan below — it’s applied with the upgrade."}
              </Notice>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Notice({ tone, children }: { tone: "err" | "warn" | "ok"; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 text-sm",
        tone === "err" && "text-destructive",
        tone === "warn" && "text-amber-700 dark:text-amber-400",
        tone === "ok" && "text-muted-foreground",
      )}
    >
      {tone !== "ok" && <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </p>
  );
}

// ---- copy ---------------------------------------------------------------

export function describeCoupon(c: CouponSummary): string {
  const amount =
    c.type === "percentage"
      ? `${trimRate(c.percentageRate)}% off`
      : c.amountCents != null && c.currency
        ? `${formatMoney(c.amountCents, c.currency)} off`
        : "Discount";
  const when =
    c.frequency === "once"
      ? "your next invoice"
      : c.frequency === "recurring"
        ? `each of your next ${c.frequencyDuration ?? "few"} invoices`
        : "every invoice";
  return `${amount} ${when}.`;
}

const trimRate = (r: string | null) => (r ? String(Number(r)) : "?");

function blockerText(b: CouponBlocker): string {
  switch (b) {
    case "expired":
      return "This coupon has expired.";
    case "terminated":
      return "This coupon is no longer available.";
    case "already_applied":
      return "This coupon is already applied to your workspace.";
    case "already_used":
      return "This coupon has already been redeemed.";
    case "not_reusable":
      return "This coupon can only be used once per workspace.";
    case "pending_free_downgrade":
      return "You have a downgrade to Free scheduled, so a coupon wouldn't discount anything. Apply it when you upgrade.";
    case "plan_overlap":
      return "You already have a coupon for this plan.";
    case "currency_mismatch":
      return "This coupon is in a different currency than your plan.";
    default:
      return "This coupon can't be applied right now.";
  }
}

function warningText(w: CouponWarning, c: CouponSummary, planName: (code: string) => string): string {
  if (w === "plan_mismatch") {
    const names = (c.planCodes ?? []).map(planName).join(", ");
    return `Only for ${names} — pick that plan below to use it.`;
  }
  return "Currency doesn’t match your plan, so it may not be deducted.";
}

export function couponErrorMessage(e: unknown): string {
  if (e instanceof HnsError) {
    if (e.code === "BILLING_COUPON_NOT_FOUND") return "We couldn't find a coupon with that code.";
    if (e.code === "BILLING_COUPON_REQUIRES_PAID_PLAN") return "Coupons can only be applied on a paid plan. Apply it when you upgrade.";
    if (e.code === "BILLING_COUPON_NOT_APPLICABLE") {
      const reason = (e.payload as { details?: { reason?: CouponBlocker } } | undefined)?.details?.reason;
      return reason ? blockerText(reason) : "This coupon can't be applied.";
    }
    if (e.code === "RATE_LIMITED") return "Too many attempts. Please wait a bit and try again.";
  }
  return e instanceof Error ? e.message : "Something went wrong. Please try again.";
}
