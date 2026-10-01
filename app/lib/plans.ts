import type { BillingPlan } from "./types";

/**
 * Everything the public pricing page and the console's billing page say about
 * a plan, in one place. Lago only carries a code, a name, a price and a
 * one-line description; the marketing copy lives here and is matched to a
 * plan by its tier. Edit this file, and both pages change together.
 */

// Lago carries each billing period as its own plan (e.g. embarko_team and
// embarko_team_annual). Plans are compared by cost-per-month regardless of
// how they're billed, so a monthly and yearly catalogue line up correctly.
const MONTHS: Record<string, number> = { monthly: 1, yearly: 12, quarterly: 3, weekly: 1 / 4 };
export const monthlyCents = (p: BillingPlan) => p.amount_cents / (MONTHS[p.interval] ?? 1);

// "free" | "creator" | "team" — the tier a plan belongs to, across periods.
export const planFamily = (plan: BillingPlan): string | null => {
  const key = `${plan.code} ${plan.name}`.toLowerCase();
  if (key.includes("free")) return "free";
  if (key.includes("creator")) return "creator";
  if (key.includes("team") || key.includes("pro")) return "team";
  return null;
};

export interface PlanFeature {
  text: string;
  /** Plain-language explanation shown behind an (i) icon — no jargon like "database". */
  tooltip?: string;
}

export interface PlanDetails {
  headline: string;
  features: (string | PlanFeature)[];
  cta: string;
  badge?: string;
  highlighted?: boolean;
}

export const PLAN_DETAILS: Record<string, PlanDetails> = {
  free: {
    headline: "Make your first app real.",
    features: [
      "Unlimited static websites",
      {
        text: "1 dynamic app",
        tooltip: "Includes a database for 1 app.",
      },
      "Your own Embarko link",
      "Share your app with anyone",
      "Your app just works",
      "Automatic updates",
      "Safe and secure",
      "Embarko branding",
    ],
    cta: "Start for free",
  },
  creator: {
    headline: "For people who can't stop building.",
    features: [
      {
        text: "Up to 5 dynamic apps",
        tooltip: "Includes a database for each app.",
      },
      "Use your own domain",
      "Remove Embarko branding",
      "Automatic backups",
      "More usage",
      "Faster performance",
      "Everything taken care of automatically",
    ],
    cta: "Start building",
    badge: "Most popular",
    highlighted: true,
  },
  team: {
    headline: "For serious builders.",
    features: [
      {
        text: "Up to 20 dynamic apps",
        tooltip: "Includes a database for each app.",
      },
      "Much more usage",
      "Advanced controls",
      "Team access",
      "Multiple versions of your apps",
      "Priority support",
    ],
    cta: "Get Team",
  },
};

/** The copy for a plan, or null for a plan outside the three known tiers. */
export const planDetails = (plan: BillingPlan): PlanDetails | null => {
  const family = planFamily(plan);
  return family ? PLAN_DETAILS[family] ?? null : null;
};

/* A plan picked on /pricing before signing in. MSG91's login widget rejects
   a redirect path with a query string (422 "redirect path format is
   invalid"), so the pick can't ride in the URL; it waits in this tab's
   sessionStorage until the billing page picks it up. */
const PLAN_AFTER_LOGIN = "embarko.planAfterLogin";

export function rememberPlanAfterLogin(code: string): void {
  try {
    sessionStorage.setItem(PLAN_AFTER_LOGIN, code);
  } catch {
    // Storage blocked: the visitor lands on billing and picks the plan there.
  }
}

/** Reads and clears the remembered plan, so it is acted on only once. */
export function takePlanAfterLogin(): string | null {
  try {
    const code = sessionStorage.getItem(PLAN_AFTER_LOGIN);
    sessionStorage.removeItem(PLAN_AFTER_LOGIN);
    return code;
  } catch {
    return null;
  }
}
