"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Check, CreditCard, ExternalLink, Star } from "lucide-react";

import {
  Alert,
  EmptyState,
  Fact,
  FactGrid,
  LinkButton,
  Page,
  PageHeader,
  Panel,
  PanelTitle,
  Skeleton,
  Tag,
  Toast,
} from "../../components/console/kit";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { useBilling } from "../../lib/billing";
import { HnsError } from "../../lib/client";
import { formatDate, formatMoney, intervalSuffix } from "../../lib/format";
import { billingApi } from "../../lib/hnsApi";
import { useSession } from "../../lib/session";
import { cn } from "../../lib/utils";
import type { BillingPlan, PaymentMethod } from "../../lib/types";

type PendingAction =
  | { kind: "change"; plan: BillingPlan }
  // Upgrade attempted with no card on file: offer Stripe checkout instead.
  | { kind: "needCard"; plan: BillingPlan }
  | { kind: "cancel" }
  | { kind: "removeCard"; card: PaymentMethod }
  | null;

type CardsState =
  | { kind: "loading" }
  | { kind: "ready"; cards: PaymentMethod[] }
  // Lago hasn't created the Stripe customer yet (happens seconds after setup).
  | { kind: "not-linked" }
  | { kind: "error"; message: string };

const errorMessage = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const price = (p: BillingPlan) => `${formatMoney(p.amount_cents, p.amount_currency)}${intervalSuffix(p.interval)}`;

// Marketing copy for each plan, mirrored from the public pricing page. Lago
// only carries a one-line description, so the feature lists live here and are
// matched to plans by code (falls back to a keyword match on the name).
const PLAN_DETAILS: Record<string, { headline: string; features: string[] }> = {
  free: {
    headline: "Make your first app real.",
    features: [
      "1 live app",
      "Your own Embarko link",
      "Share your app with anyone",
      "Your app just works",
      "Automatic updates",
      "Safe and secure",
      "Embarko branding",
    ],
  },
  creator: {
    headline: "For people who can’t stop building.",
    features: [
      "Up to 5 live apps",
      "Use your own domain",
      "Remove Embarko branding",
      "Automatic backups",
      "More usage",
      "Faster performance",
      "Everything taken care of automatically",
    ],
  },
  team: {
    headline: "For serious builders.",
    features: [
      "Up to 20 live apps",
      "Much more usage",
      "Advanced controls",
      "Team access",
      "Multiple versions of your apps",
      "Priority support",
    ],
  },
};

const planDetails = (plan: BillingPlan) => {
  const key = `${plan.code} ${plan.name}`.toLowerCase();
  if (key.includes("free")) return PLAN_DETAILS.free;
  if (key.includes("creator")) return PLAN_DETAILS.creator;
  if (key.includes("team") || key.includes("pro")) return PLAN_DETAILS.team;
  return null;
};

export default function BillingPage() {
  const { activeCompanyId, activeCompany, user } = useSession();
  const { active, pending, plans, setup, isFree, error: billingError, reload } = useBilling();

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const clearNotice = useCallback(() => setNotice(null), []);
  const [busy, setBusy] = useState<string | null>(null); // which action is in flight
  const [confirm, setConfirm] = useState<PendingAction>(null);
  const [cards, setCards] = useState<CardsState>({ kind: "loading" });

  // Saved cards live on this page only (the header doesn't need them).
  const loadCards = useCallback(async () => {
    if (!activeCompanyId || setup !== "ready") return;
    setCards({ kind: "loading" });
    try {
      setCards({ kind: "ready", cards: await billingApi.paymentMethods(activeCompanyId) });
    } catch (e) {
      if (e instanceof HnsError && e.code === "BILLING_PROVIDER_NOT_LINKED") setCards({ kind: "not-linked" });
      else setCards({ kind: "error", message: errorMessage(e, "Couldn’t load payment methods.") });
    }
  }, [activeCompanyId, setup]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Every mutation goes through here: one in-flight action at a time, errors
  // surface in the page-level alert, and only the affected data is refetched.
  // `fn` may return a notice to show on success.
  async function run(
    key: string,
    fn: (companyId: string) => Promise<string | void>,
    refresh: "status" | "cards" | "none",
  ) {
    if (!activeCompanyId) return;
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const done = await fn(activeCompanyId);
      if (done) setNotice(done);
      if (refresh === "status") await reload();
      if (refresh === "cards") await loadCards();
    } catch (e) {
      setError(errorMessage(e, "Something went wrong. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  const setUpBilling = () =>
    run(
      "setup",
      async (id) => {
        if (!activeCompany || !user) return;
        await billingApi.setup(id, { name: activeCompany.companyName, email: user.email });
        return "Billing is set up. You’re on the Free plan.";
      },
      "status",
    );

  // Lago decides whether a change is immediate or end-of-period; the returned
  // subscription's status says which, so the notice reflects what happened.
  const changePlan = (plan: BillingPlan) =>
    run(
      `plan:${plan.code}`,
      async (id) => {
        const sub = await billingApi.changePlan(id, plan.code);
        return sub.status === "pending"
          ? `Your plan will switch to ${plan.name} at the end of the current billing period.`
          : `You’re now on ${plan.name}.`;
      },
      "status",
    );

  // Upgrades charge immediately, so Lago needs a card first. Re-fetch rather
  // than trusting the cached list (a card may have been removed elsewhere).
  const startChange = (plan: BillingPlan) => {
    if (!isUpgrade(plan, active?.plan ?? null)) {
      setConfirm({ kind: "change", plan });
      return;
    }
    run(
      `plan:${plan.code}`,
      async (id) => {
        let methods: PaymentMethod[] = [];
        try {
          methods = await billingApi.paymentMethods(id);
        } catch (e) {
          if (!(e instanceof HnsError && e.code === "BILLING_PROVIDER_NOT_LINKED")) throw e;
        }
        setCards({ kind: "ready", cards: methods });
        setConfirm(methods.length > 0 ? { kind: "change", plan } : { kind: "needCard", plan });
      },
      "none",
    );
  };

  const cancelPlan = () =>
    run("cancel", async (id) => {
      await billingApi.cancel(id);
      return "Your paid plan is cancelled. You’re back on Free.";
    }, "status");

  // Stripe-hosted page; the URL is single-use, so navigate rather than cache it.
  const addCard = () =>
    run("checkout", async (id) => {
      const { checkoutUrl } = await billingApi.checkoutUrl(id);
      window.location.assign(checkoutUrl);
    }, "none");

  const removeCard = (card: PaymentMethod) =>
    run(`remove:${card.id}`, async (id) => {
      await billingApi.removePaymentMethod(id, card.id);
      return "Card removed.";
    }, "cards");

  const currentPlan = active?.plan ?? null;
  const hasDefaultCard = cards.kind === "ready" && cards.cards.some((c) => c.isDefault);
  const companyName = activeCompany?.companyName ?? "this company";

  return (
    <Page>
      <PageHeader
        title="Billing"
        subtitle={
          <>Plan and payment details for <b className="text-foreground">{companyName}</b>. Upgrades apply right away; downgrades take effect at the end of the current period.</>
        }
      />

      {(error || billingError) && <Alert>{error ?? billingError}</Alert>}
      <Toast message={notice} onClose={clearNotice} />

      {/* ---------------------------------------------------- loading */}
      {setup === "unknown" && !billingError && (
        <>
          <Skeleton className="h-[140px]" />
          <Skeleton className="h-[220px]" />
        </>
      )}

      {/* ---------------------------------------------------- not set up */}
      {setup === "none" && (
        <EmptyState title="Billing isn’t set up yet">
          Set it up to pick a plan and save a payment method. You’ll start on the Free plan — nothing is charged.
          <span className="mt-5 block">
            <Button onClick={setUpBilling} disabled={busy != null}>
              {busy === "setup" ? "Setting up…" : "Set up billing"}
            </Button>
          </span>
        </EmptyState>
      )}

      {/* ---------------------------------------------------- current plan */}
      {setup === "ready" && active && (
        <Panel padded>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[0.66rem] uppercase tracking-[0.1em] text-faint">Current plan</div>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
                {currentPlan?.name ?? active.plan_code}
              </h2>
              {currentPlan && <div className="mt-0.5 text-[0.95rem] text-muted-foreground">{price(currentPlan)}</div>}
              {currentPlan?.description && (
                <p className="mt-1.5 max-w-[60ch] text-[0.92rem] text-muted-foreground">{currentPlan.description}</p>
              )}
            </div>
            {isFree && (
              <Button asChild>
                <a href="#plans">Upgrade plan</a>
              </Button>
            )}
          </div>

          <FactGrid flush>
            <Fact k="Status" v={<span className="capitalize">{active.status}</span>} flush />
            <Fact k="Started" v={formatDate(active.started_at ?? active.subscription_at ?? active.created_at ?? null)} flush />
            <Fact k="Current period ends" v={formatDate(active.current_billing_period_ending_at ?? null)} flush />
            <Fact k="Plan code" v={active.plan_code} mono flush />
          </FactGrid>

          {pending && (
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-info bg-[var(--info-soft)] px-4 py-3 text-sm text-foreground">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
              <div>
                <span className="font-semibold">Scheduled change</span>
                <span className="mx-1.5 text-faint">·</span>
                You’ll move to <b className="font-semibold">{pending.plan?.name ?? pending.plan_code}</b>
                {pending.plan && <> ({price(pending.plan)})</>}
                {active.current_billing_period_ending_at
                  ? <> on <b className="font-semibold">{formatDate(active.current_billing_period_ending_at)}</b>.</>
                  : <> at the end of the current billing period.</>}
                {" "}Your current plan stays active until then.
              </div>
            </div>
          )}
        </Panel>
      )}

      {/* ---------------------------------------------------- plans */}
      {setup === "ready" && (
        <section id="plans" className="flex flex-col gap-3.5 scroll-mt-20">
          <div className="flex items-baseline justify-between">
            <PanelTitle>Plans</PanelTitle>
            {!isFree && cards.kind === "ready" && !hasDefaultCard && (
              <span className="text-[0.82rem] text-warning">No default card on file — add one below to keep your plan active.</span>
            )}
          </div>

          {plans.length === 0 ? (
            <Skeleton className="h-[200px]" />
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => {
                const current = active?.plan_code === plan.code;
                const scheduled = pending?.plan_code === plan.code;
                const upgrade = isUpgrade(plan, currentPlan);
                const details = planDetails(plan);
                return (
                  <Panel
                    key={plan.code}
                    padded
                    className={cn("flex flex-col", current && "border-foreground/60 ring-1 ring-foreground/20")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                        {(details?.headline ?? plan.description) && (
                          <p className="mt-0.5 text-[0.85rem] text-muted-foreground">{details?.headline ?? plan.description}</p>
                        )}
                      </div>
                      {current && <Tag tone="ok">current</Tag>}
                      {scheduled && <Tag tone="scheduled">scheduled</Tag>}
                    </div>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold tracking-tight text-foreground">
                        {formatMoney(plan.amount_cents, plan.amount_currency)}
                      </span>
                      <span className="text-[0.88rem] text-muted-foreground">{intervalSuffix(plan.interval)}</span>
                    </div>
                    {details ? (
                      <ul className="mt-5 flex flex-1 flex-col gap-2 border-t border-border pt-4">
                        {details.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-[0.88rem] text-foreground/90">
                            <Check className="mt-[3px] size-3.5 shrink-0 text-foreground" aria-hidden="true" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 flex-1 text-[0.9rem] leading-relaxed text-muted-foreground">{plan.description}</p>
                    )}
                    <div className="mt-5">
                      {current || scheduled ? (
                        <Button variant="outline" className="w-full" disabled>
                          {current && <Check className="size-4" aria-hidden="true" />}
                          {current ? "Current plan" : scheduled && active?.current_billing_period_ending_at
                            ? `Starts ${formatDate(active.current_billing_period_ending_at)}`
                            : "Scheduled"}
                        </Button>
                      ) : (
                        <Button
                          variant={upgrade ? "default" : "outline"}
                          className="w-full"
                          disabled={busy != null || !active}
                          onClick={() => startChange(plan)}
                        >
                          {busy === `plan:${plan.code}` ? "Checking…" : upgrade ? "Upgrade" : "Downgrade"}
                        </Button>
                      )}
                    </div>
                  </Panel>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ---------------------------------------------------- payment methods */}
      {setup === "ready" && (
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
            <div>
              <PanelTitle>Payment methods</PanelTitle>
              <p className="mt-0.5 text-[0.88rem] text-muted-foreground">Cards are stored securely with Stripe. The default card is charged each period.</p>
            </div>
            <Button variant="outline" size="sm" onClick={addCard} disabled={busy != null || cards.kind === "not-linked"}>
              <CreditCard className="size-4" aria-hidden="true" />
              {busy === "checkout" ? "Opening…" : "Add card"}
              <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </Button>
          </div>

          {cards.kind === "loading" && <div className="p-6"><Skeleton className="h-[72px]" /></div>}

          {cards.kind === "not-linked" && (
            <div className="p-6">
              <Alert variant="info">
                Your payment account is still being created. This usually takes a few seconds — refresh shortly.
                <LinkButton className="ml-3" onClick={loadCards}>Refresh</LinkButton>
              </Alert>
            </div>
          )}

          {cards.kind === "error" && <div className="p-6"><Alert>{cards.message}</Alert></div>}

          {cards.kind === "ready" && cards.cards.length === 0 && (
            <div className="p-6">
              <EmptyState title="No cards saved">
                Add a card to move to a paid plan. You’ll be taken to a secure Stripe page and brought back here.
              </EmptyState>
            </div>
          )}

          {cards.kind === "ready" && cards.cards.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Card</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.cards.map((c) => {
                  const removing = busy === `remove:${c.id}`;
                  return (
                    <TableRow key={c.id} className={cn(removing && "opacity-50")}>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <span className="font-medium capitalize text-foreground">{c.card?.brand ?? c.type}</span>
                          {c.card && <span className="font-mono text-[0.85rem] text-muted-foreground">•••• {c.card.last4}</span>}
                          {c.isDefault && (
                            <Tag>
                              <Star className="mr-1 inline size-2.5 -translate-y-px" aria-hidden="true" />default
                            </Tag>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-[0.82rem] text-faint">
                        {c.card ? `${String(c.card.expMonth).padStart(2, "0")}/${c.card.expYear}` : "—"}
                      </TableCell>
                      <TableCell className="text-[0.88rem] text-muted-foreground">{c.billingDetails.name ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <LinkButton danger onClick={() => setConfirm({ kind: "removeCard", card: c })} disabled={busy != null}>
                          {removing ? "Removing…" : "Delete"}
                        </LinkButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Panel>
      )}

      {/* ---------------------------------------------------- cancel */}
      {setup === "ready" && active && !isFree && (
        <Panel padded tone="danger">
          <PanelTitle tone="danger">Cancel plan</PanelTitle>
          <p className="mt-1.5 max-w-[60ch] text-[0.92rem] text-muted-foreground">
            Moves {companyName} back to the Free plan. Apps above the Free limits may stop being served. Saved cards are kept.
          </p>
          <div className="mt-4">
            <Button variant="destructive" onClick={() => setConfirm({ kind: "cancel" })} disabled={busy != null}>
              {busy === "cancel" ? "Cancelling…" : "Cancel plan"}
            </Button>
          </div>
        </Panel>
      )}

      <ConfirmDialog
        action={confirm}
        currentPlan={currentPlan}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          const a = confirm;
          setConfirm(null);
          if (a?.kind === "change") changePlan(a.plan);
          else if (a?.kind === "needCard") addCard();
          else if (a?.kind === "cancel") cancelPlan();
          else if (a?.kind === "removeCard") removeCard(a.card);
        }}
      />
    </Page>
  );
}

// Higher price = upgrade. Used for button labels and confirm copy only; the
// server decides whether the change is immediate or scheduled.
function isUpgrade(target: BillingPlan, current: BillingPlan | null): boolean {
  return target.amount_cents > (current?.amount_cents ?? 0);
}

function describe(action: NonNullable<PendingAction>, currentPlan: BillingPlan | null) {
  switch (action.kind) {
    case "change": {
      const up = isUpgrade(action.plan, currentPlan);
      return {
        title: `${up ? "Upgrade" : "Downgrade"} to ${action.plan.name}?`,
        body: up ? (
          <>You’ll be moved to <b>{action.plan.name}</b> ({price(action.plan)}) immediately and your default card will be charged.</>
        ) : (
          <>You’ll stay on {currentPlan?.name ?? "your current plan"} until the end of this billing period, then switch to <b>{action.plan.name}</b> ({price(action.plan)}).</>
        ),
        cta: up ? "Upgrade" : "Schedule downgrade",
        destructive: false,
      };
    }
    case "needCard":
      return {
        title: "Add a payment method first",
        body: (
          <>
            Upgrading to <b>{action.plan.name}</b> ({price(action.plan)}) charges your card right away, and there’s no card on file yet. Add one with Stripe, then come back to upgrade.
          </>
        ),
        cta: "Add card",
        destructive: false,
      };
    case "cancel":
      return {
        title: "Cancel your paid plan?",
        body: <>You’ll move back to the Free plan. Anything above the Free limits may stop working.</>,
        cta: "Cancel plan",
        destructive: true,
      };
    case "removeCard": {
      const c = action.card;
      return {
        title: "Delete this card?",
        body: (
          <>
            <span className="capitalize">{c.card?.brand ?? c.type}</span>
            {c.card && <> ending in <b>{c.card.last4}</b></>} will be removed from this company.
            {c.isDefault && <> It’s your default card — add another one afterwards to keep a paid plan active.</>}
          </>
        ),
        cta: "Delete card",
        destructive: true,
      };
    }
  }
}

function ConfirmDialog({
  action,
  currentPlan,
  onClose,
  onConfirm,
}: {
  action: PendingAction;
  currentPlan: BillingPlan | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const d = action ? describe(action, currentPlan) : null;
  return (
    <Dialog open={action != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{d?.title}</DialogTitle>
          <DialogDescription>{d?.body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Keep as is</DialogClose>
          <Button variant={d?.destructive ? "destructive" : "default"} onClick={onConfirm}>{d?.cta}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
