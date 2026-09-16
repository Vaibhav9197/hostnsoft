// Control-plane types for the Embarko console.
// These mirror the hostnsoft-api data model exactly (see the API reference).
// The console talks to that API through the Next.js BFF proxy under /api/hns/*,
// so these shapes are the wire shapes the proxy passes through untouched.

export type MemberStatus = "invited" | "active";

// hostnsoft-api deployment status. Only these three exist server-side.
export type DeploymentStatus = "success" | "failed" | "in_progress";

// Live health, resolved per-request from hostnsoft-deploy's Nomad allocation
// status. The list endpoint carries it too, so a card can say whether an app is
// up without fetching each project in turn.
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
  /** The deploy currently serving this project, null before the first one. */
  currentDeploymentId: string | null;
  /** How that deploy ended. Null before anything has been deployed. */
  status: DeploymentStatus | null;
  health: ProjectHealth;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET one returns the same shape the list does; the name is kept because it
 *  reads better at call sites that fetch a single project. */
export type ProjectDetail = Project;

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
  /** Whether this is the deploy currently serving traffic. Exactly one row
   *  carries it, and a rollback moves it onto the new row it creates rather
   *  than onto the deploy being restored. */
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
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

// ---------------------------------------------------------------- Analytics
// GET /companies/:id/projects/:id/analytics. The pipeline is optional
// infrastructure: a 503 means it couldn't be reached, which is NOT the same as
// an app with no traffic (that answers 200 with zeroes).
export type AnalyticsRange = "24h" | "7d" | "30d" | "90d" | "all";

export interface TrafficSeriesPoint {
  bucketStart: string;
  requests: number;
  errors: number;
}

export interface ResourceSeriesPoint {
  bucketStart: string;
  avgCpuPercent: number;
  maxCpuPercent: number;
  avgMemoryMb: number;
  maxMemoryMb: number;
}

export interface ProjectAnalytics {
  traffic: {
    range: AnalyticsRange;
    totalRequests: number;
    statusBreakdown: { "2xx": number; "3xx": number; "4xx": number; "5xx": number };
    // Both null when nothing was served in the range.
    latencyMs: { p50: number | null; p95: number | null };
    topPaths: { path: string; requests: number }[];
    series: TrafficSeriesPoint[];
  };
  resourceUsage: {
    range: AnalyticsRange;
    // null if never sampled — e.g. the app isn't running.
    current: { cpuPercent: number; memoryMb: number; sampledAt: string } | null;
    series: ResourceSeriesPoint[];
  };
}

/** GET /apps/:slug/logs — recent tail of the app's most recent allocation.
 *  App-level and non-streaming: there is one current allocation, so these are
 *  the running app's logs rather than any particular deploy's build output.
 *  `available` is false before anything has ever been allocated. */
export type AppLogs =
  | { available: true; allocId: string; stream: LogStream; logs: string }
  | { available: false; reason: string };

export type LogStream = "stdout" | "stderr";

// ------------------------------------------------------------------ Showcase
// hostnsoft-api docs/showcase.md. Two kinds of page at /showcase/<slug>: a
// COMPANY page (its own apps only) and PUBLIC boards (anyone's apps). No
// approval — everything is live at once.

export type ShowcaseType = "company" | "public";

export interface ShowcaseCollectionCounts {
  total: number;
  // Not hidden by the organiser — what the public page actually shows.
  publicCount: number;
}

// The owner's view of a page it owns.
export interface ShowcaseCollection {
  id: string;
  slug: string;
  title: string;
  intro: string | null;
  type: ShowcaseType;
  companyId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  counts: ShowcaseCollectionCounts;
}

// Public shape of a page; also what the submit form's picker lists.
export interface ShowcasePage {
  slug: string;
  title: string;
  intro: string | null;
  type: ShowcaseType;
  projectCount: number;
  createdAt: string;
}

// One deployed app listed under one collection.
export interface ShowcaseListing {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  whatItDoes: string | null;
  whyBuilt: string | null;
  // Derived from the Project at listing time, never typed.
  appUrl: string;
  screenshotUrl: string | null;
  videoUrl: string | null;
  creatorName: string;
  creatorProfile: string | null;
  builtWith: string | null;
  category: string | null;
  tags: string[];
  featured: boolean;
  createdAt: string;
  collection: { slug: string; title: string; type: ShowcaseType };
  collectionId: string;
  // The deployed app and the company/member who listed it.
  projectId: string;
  companyId: string;
  submittedBy: string;
  // The organiser's switch: hidden from the public page.
  isPrivate: boolean;
  updatedAt: string;
}

export interface ShowcaseCollectionDetail extends ShowcaseCollection {
  projects: ShowcaseListing[];
}

// What a member sends to list one of their company's apps.
export interface ShowcaseSubmissionInput {
  collectionSlug: string;
  projectId: string;
  name: string;
  tagline: string;
  whatItDoes?: string;
  whyBuilt?: string;
  creatorName: string;
  creatorProfile?: string;
  builtWith?: string;
  category?: string;
  tags?: string[];
  videoUrl?: string;
  screenshotUrl?: string;
}

// Admin views.
export interface AdminShowcaseCollection extends ShowcaseCollection {
  companyName?: string;
}

export interface AdminShowcaseCollectionPage {
  items: AdminShowcaseCollection[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminShowcaseListing extends ShowcaseListing {
  submitterCompany: { id: string; name?: string };
  ownerCompany: { id: string; name?: string };
}

export interface AdminShowcaseListingPage {
  items: AdminShowcaseListing[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
