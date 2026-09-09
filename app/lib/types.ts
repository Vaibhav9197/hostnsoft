// Control-plane types for the Embarko console.
// These mirror the hostnsoft-api data model exactly (see the API reference).
// The console talks to that API through the Next.js BFF proxy under /api/hns/*,
// so these shapes are the wire shapes the proxy passes through untouched.

export type MemberStatus = "invited" | "active";

// hostnsoft-api deployment status. Only these three exist server-side.
export type DeploymentStatus = "success" | "failed" | "in_progress";

// Live health, resolved per-request from hostnsoft-deploy's Nomad allocation
// status. Only GET-one carries it — it isn't a stored column, and the list
// endpoint leaves it out deliberately to stay cheap.
export type ProjectHealth =
  | "running" // healthy, actively serving traffic
  | "starting" // just deployed / redeploying, allocation not placed yet
  | "crashed" // allocation failed or was lost — needs attention
  | "stopped" // job exists but isn't running (rare in normal use)
  | "not_deployed" // no Nomad job for this slug yet — normal before the first deploy
  | "unknown"; // couldn't reach hostnsoft-deploy; never blocks the request

// The logged-in user plus the companies they belong to. From GET /auth/me and
// the /auth/msg91/exchange response.
export interface CompanyMembershipSummary {
  companyId: string;
  companyName: string;
  status?: MemberStatus;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface MeResponse extends AuthUser {
  companies: CompanyMembershipSummary[];
  // Platform-wide admin flag from the identity backend. Gates the /admin
  // surfaces; absent for ordinary users, so treat a missing value as false.
  isSuperAdmin?: boolean;
  // false when identity came from the MSG91 proxy because hostnsoft-api
  // (the data backend) was unreachable — the user is logged in, but company/
  // project data can't be loaded until the backend is up.
  apiConnected?: boolean;
}

export interface Company {
  id: string;
  name: string;
  createdAt: string;
  msg91Id: string | null;
}

// A row from GET /companies — company plus the caller's status in it.
export interface CompanyWithMembership extends Company {
  status: MemberStatus;
}

// GET /companies/:id — detail with counts.
export interface CompanyDetail extends Company {
  memberCount: number;
  projectCount: number;
}

export interface Member {
  userId: string;
  email: string;
  status: MemberStatus;
}

export interface Project {
  id: string;
  // null only for an unclaimed orphan (anonymous) deploy.
  companyId: string | null;
  slug: string;
  name: string;
  memoryMb: number;
  // Anonymous-deploy state: a deploy nobody has claimed yet, and when that
  // window runs out.
  isOrphan: boolean;
  orphanExpiresAt: string | null;
  createdAt: string;
}

// GET one project adds live health on top of the stored row.
export interface ProjectDetail extends Project {
  health: ProjectHealth;
}

export interface EnvVar {
  id: string;
  projectId: string;
  key: string;
  value: string;
  updatedAt: string;
  updatedBy: string | null;
}

// List view of a deploy token — the raw secret is never included here.
export interface DeployToken {
  id: string;
  label: string;
  tokenPrefix: string;
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
}

// Create/rotate response — the one time the raw token is returned.
export interface DeployTokenSecret {
  id: string;
  label: string;
  prefix: string;
  createdAt: string;
  token: string;
  // Only present on rotate: how long the old token keeps working.
  oldTokenValidUntil?: string;
}

export interface Deployment {
  id: string;
  projectId: string;
  version: string; // "v1", "v2", ... — unique per project, use as the row key
  appVersion: string; // not unique, may repeat
  imageTag: string | null;
  memoryMb: number | null;
  status: DeploymentStatus;
  errorDetail: string | null;
  triggeredBy: string | null;
  createdAt: string;
  finishedAt: string | null;
}

// ------------------------------------------------------------- Custom domains
// A client-owned domain attached to a project. `domain` is unique platform-wide.

export type DomainStatus = "pending_dns" | "active" | "failed";

// Which shape the API classified the domain as, and therefore which record it
// asks for: an apex takes an A record, a subdomain takes a CNAME.
export type DomainKind = "apex" | "subdomain";

// The DNS record the user has to create at their own registrar. The API picks
// the type from the domain's shape: CNAME for a subdomain, A for an apex.
export interface DomainInstructions {
  type: "CNAME" | "A";
  name: string;
  value: string;
}

export interface Domain {
  domain: string;
  status: DomainStatus;
  // ONLY returned by register (201) and by a verify that didn't resolve (422).
  // The list endpoint omits it, so rows read back on a later visit arrive with
  // no record attached — see how the Domain page recovers it.
  instructions?: DomainInstructions;
  // Why the last verify didn't resolve — only on a failed verify.
  error?: string;

  // Present on rows from the list endpoint, absent from register/verify.
  id?: string;
  projectId?: string;
  type?: DomainKind;
  lastVerifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Normalized error shape the BFF returns for every failure.
export interface ApiError {
  error: string;
  details?: { path: string; message: string }[];
  status: number;
}

// ------------------------------------------------------------------ Billing
// Billing lives in Lago (plans, customers, subscriptions) and Stripe (saved
// cards). hostnsoft-api passes Lago objects through mostly untouched, so these
// are Lago's snake_case wire shapes, trimmed to what the console renders.

export interface BillingPlan {
  lago_id: string;
  name: string;
  code: string;
  description?: string | null;
  interval: string; // "monthly" | "yearly" | "weekly" | "quarterly"
  amount_cents: number;
  amount_currency: string;
  trial_period?: number | null;
  pay_in_advance?: boolean;
}

// "active" is the plan in force; a "pending" one alongside it is a scheduled
// downgrade that takes effect at the end of the current period.
export type BillingSubscriptionStatus = "active" | "pending" | string;

export interface BillingSubscription {
  lago_id: string;
  external_id: string;
  external_customer_id: string;
  plan_code: string;
  status: BillingSubscriptionStatus;
  name?: string | null;
  started_at?: string | null;
  ending_at?: string | null;
  subscription_at?: string | null;
  created_at?: string;
  current_billing_period_started_at?: string | null;
  current_billing_period_ending_at?: string | null;
  // Present on status responses only: the full plan, or null if the code no
  // longer exists in Lago.
  plan?: BillingPlan | null;
}

// GET /companies/:id/billing. Empty list = billing not set up yet.
export interface BillingStatus {
  subscriptions: BillingSubscription[];
}

// GET /companies/:id/billing/payment-methods — trimmed Stripe payment method.
export interface PaymentMethod {
  id: string;
  type: string;
  isDefault: boolean;
  created: number; // unix seconds
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    funding?: string;
    country?: string | null;
  };
  billingDetails: {
    name: string | null;
    email: string | null;
  };
}
