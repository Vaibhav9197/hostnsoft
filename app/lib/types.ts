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
  projectCount: number;
}

// ------------------------------------------------------------------- Roles
// What a person may do in a workspace (hostnsoft-api lib/permissions.ts).
// Who is in the workspace at all stays with the members embed.
export type WorkspaceRole = "owner" | "admin" | "developer" | "viewer" | "billing";
export type AppScope = "all" | "selected";
export type AppLevel = "manage" | "view";
export type Permission =
  | "workspace.manage"
  | "members.manage"
  | "billing.manage"
  | "tokens.manage"
  | "app.create"
  | "app.delete"
  | "app.deploy"
  | "app.settings"
  | "app.view"
  | "app.logs"
  | "app.move";

export interface AppGrant {
  projectId: string;
  level: AppLevel;
}

// One member, the same shape from the list, get-one and every change.
export interface Member {
  userId: string;
  name: string | null;
  email: string | null;
  role: WorkspaceRole;
  // false = never given a role; they count as an Admin.
  roleIsSet: boolean;
  appScope: AppScope;
  canCreate: boolean;
  canDelete: boolean;
  apps: AppGrant[];
  isYou: boolean;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: WorkspaceRole;
  appScope: AppScope;
  canCreate: boolean;
  canDelete: boolean;
  apps: AppGrant[];
  invitedBy: string;
  createdAt: string;
}

export interface MembersList {
  members: Member[];
  // false when the identity service couldn't list everyone; the list then
  // holds only people we already know about.
  complete: boolean;
  invites: PendingInvite[];
}

export interface RoleChange {
  role: WorkspaceRole;
  appScope?: AppScope;
  canCreate?: boolean;
  canDelete?: boolean;
}

// GET /me/permissions — so the UI can hide what the person can't do.
export interface MyPermissions {
  companyId: string;
  userId: string;
  role: WorkspaceRole;
  roleIsSet: boolean;
  appScope: AppScope;
  canCreate: boolean;
  canDelete: boolean;
  permissions: Permission[];
  apps: { projectId: string; level: AppLevel; permissions: Permission[] }[];
}

export interface Project {
  id: string;
  // null only for an unclaimed orphan (anonymous) deploy.
  companyId: string | null;
  slug: string;
  name: string;
  memoryMb: number;
  /** "static": a plain site served from its files — no process, so no env
   *  vars, memory or logs. "service": built and run as a server app. */
  kind: "static" | "service";
  // Anonymous-deploy state: a deploy nobody has claimed yet, and when that
  // window runs out.
  isOrphan: boolean;
  orphanExpiresAt: string | null;
  /** The deploy currently serving this project, null before the first one. */
  currentDeploymentId: string | null;
  /** How that deploy ended. Null before anything has been deployed. */
  status: DeploymentStatus | null;
  health: ProjectHealth;
  /** Scheduled jobs: how many, and how many are failing right now. A failing
   *  one makes the app "Needs attention" (HealthPill). Optional so an API
   *  that predates schedules still type-checks. */
  schedules?: ScheduleSummary;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleSummary {
  count: number;
  failing: number;
}

/** One run of a scheduled job. `responseExcerpt` is the start of what the
 *  app replied, often a one-line summary of what the job did. */
export interface ScheduleRun {
  id: string;
  trigger: "schedule" | "manual";
  outcome: "running" | "ok" | "failed" | "skipped";
  terminal: boolean;
  httpStatus: number | null;
  error: string | null;
  responseExcerpt: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
}

/** One page of a job's run history. Runs beyond `kept` (per job) are deleted. */
export interface ScheduleRunsPage {
  runs: ScheduleRun[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  kept: number;
}

/** A timed call into the app, declared in its embarko.json. Read-only here:
 *  the AI changes schedules, the panel shows them. */
export interface Schedule {
  id: string;
  name: string | null;
  cron: string;
  timezone: string;
  path: string;
  url: string;
  enabled: boolean;
  nextRunAt: string | null;
  failing: boolean;
  consecutiveFailures: number;
  lastRun: ScheduleRun | null;
  createdAt: string;
  updatedAt: string;
}

/** GET one returns the same shape the list does; the name is kept because it
 *  reads better at call sites that fetch a single project. */
export type ProjectDetail = Project;

// POST .../projects/:projectId/move — the app as it now is, in its new
// workspace (same shape as GET one), and where it went from/to.
export interface ProjectMoveResult {
  project: ProjectDetail;
  from: string;
  to: string;
  // True when the two workspaces are on different plans, so the "Hosted on
  // Embarko" footer is being added or removed on the live app.
  footerResync: boolean;
}

/** POST /companies/:companyId/orphans/claim — the app now belongs to the
 *  company and won't be deleted. `applied` says whether the running image
 *  was re-pushed without the temporary-app notice straight away; when it
 *  couldn't be (no recorded image to re-push), the notice goes with the
 *  next deploy instead. */
export interface OrphanClaimResult {
  project: Project;
  applied: boolean;
  deploymentId: string | null;
  bannerClearsOn: "now" | "next_deploy";
}

/** 202 from PATCH .../slug for an app that is live: the move is running in
 *  the background and its outcome comes from SlugChangeStatus, not here. */
export interface SlugChangeAccepted {
  moving: true;
  from: string;
  to: string;
  statusUrl: string;
}

/** How a live address change ended. The server forgets it a while after it
 *  finishes, so a poller that gets a 404 should read the project instead. */
export type SlugChangeStatus = {
  state: "in_progress" | "succeeded" | "failed";
  from: string;
  to: string;
  startedAt: string;
  finishedAt?: string;
  /** Present only on "failed". */
  code?: string;
  reason?: string;
};

export interface EnvVar {
  id: string;
  projectId: string;
  key: string;
  // null when valueHidden: the person can see the app but not change its
  // settings, so they see which variables are set, not what they hold.
  value: string | null;
  valueHidden: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

// What a token may reach. "user": acts as the person who made it, in every
// workspace they're in (shown as "Just me"); this workspace is only where
// its new apps go. "workspace": this workspace's apps only, whoever made it
// (shown as "Whole workspace") — for CI and shared machines.
export type DeployTokenKind = "user" | "workspace";

// List view of a deploy token — the raw secret is never included here.
// Create and rotate return the same fields plus the secret.
export interface DeployToken {
  id: string;
  label: string;
  tokenPrefix: string;
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  source: "dashboard" | "agent" | "connector";
  kind: DeployTokenKind;
  // Proxy user id of whoever made it — for a "user" token, who it acts as.
  createdBy: string;
}

// Create/rotate response — the one time the raw token is returned.
export interface DeployTokenSecret extends DeployToken {
  prefix: string;
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
  /** "dashboard" (a person here) or "agent" (anything using a deploy token).
   *  Null on a few rows older than the field. */
  source: "dashboard" | "agent" | null;
  /** The agent's own name for itself ("claude-code", "chatgpt"...), when it
   *  sent one. Self-reported. */
  agentName: string | null;
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
// hostnsoft-api docs/showcase.md. Two places an app is shown: the PUBLIC
// gallery at /showcase, and EVENT pages at /showcase/<slug> (anyone's apps).
// No approval — everything is live at once.

export type ShowcaseType = "public" | "event";

export interface ShowcaseCollectionCounts {
  total: number;
  // Approved and not hidden by the organiser — what the public page actually shows.
  publicCount: number;
  // Awaiting the organiser's review. Always 0 on the public page.
  pending: number;
}

// An event listing's review state. Public-page placements are always approved.
export type ShowcaseListingStatus = "pending" | "approved" | "rejected";

// The owner's view of a page it owns.
export interface ShowcaseCollection {
  id: string;
  slug: string;
  title: string;
  intro: string | null;
  type: ShowcaseType;
  companyId: string;
  createdBy: string;
  // Handed to participants; submitting with it skips review. Absent on the public page.
  submitCode?: string;
  // On: every app goes on the page at once. Off: the organiser reviews unless
  // the app was sent with the code. Absent on the public page.
  autoApprove?: boolean;
  // Organiser-supplied HTML shown on an event page above its apps. Only the
  // single-page reads (create, detail, edit) carry it; lists leave it out.
  customHtml?: string | null;
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
  // Events only: apps go on at once, no code needed.
  autoApprove?: boolean;
  projectCount: number;
  createdAt: string;
}

// One deployed app listed under one collection.
export interface ShowcaseListing {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string | null;
  story: string | null;
  // Derived from the Project at listing time, never typed.
  appUrl: string;
  screenshotUrl: string | null;
  videoUrl: string | null;
  creatorName: string;
  creatorProfile: string | null;
  // "Contact Dev" recipient, shown in the owner's console only.
  contactEmail: string | null;
  builtWith: string | null;
  category: string | null;
  tags: string[];
  // Creator-supplied HTML for the app details page, and the spec it was built from.
  customHtml: string | null;
  prd: string | null;
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
  status: ShowcaseListingStatus;
  rejectionReason: string | null;
  updatedAt: string;
}

export interface ShowcaseCollectionDetail extends ShowcaseCollection {
  projects: ShowcaseListing[];
}

// What a member sends to list one of their company's apps.
export interface ShowcaseSubmissionInput {
  collectionSlug: string;
  // The event's submit code, if the person has one. Wrong code = pending, not an error.
  code?: string;
  projectId: string;
  name: string;
  tagline: string;
  description?: string;
  story?: string;
  creatorName: string;
  creatorProfile?: string;
  contactEmail?: string;
  builtWith?: string;
  category?: string;
  tags?: string[];
  videoUrl?: string;
  screenshotUrl?: string;
  customHtml?: string;
  prd?: string;
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

// ---- Coupons (docs/billing.md "Coupons" in hostnsoft-api) -----------------

export type CouponFrequency = "once" | "recurring" | "forever";

export type CouponBlocker =
  | "terminated"
  | "expired"
  | "already_applied"
  | "already_used"
  | "pending_free_downgrade"
  | "not_reusable"
  | "plan_overlap"
  | "currency_mismatch"
  | "other";

export type CouponWarning = "plan_mismatch" | "currency_mismatch";

export interface CouponSummary {
  code: string;
  name: string;
  description: string | null;
  type: "fixed_amount" | "percentage";
  amountCents: number | null;
  currency: string | null;
  percentageRate: string | null;
  frequency: CouponFrequency;
  frequencyDuration: number | null;
  expiresAt: string | null;
  // null = applies to every plan.
  planCodes: string[] | null;
  reusable: boolean;
}

// GET /companies/:id/billing/coupons/:code — nothing is applied by a check.
export interface CouponCheck {
  coupon: CouponSummary;
  applicable: boolean;
  blockers: CouponBlocker[];
  warnings: CouponWarning[];
  // The coupon waives the card on upgrade (decided server-side from the
  // coupon table; this flag only lets the UI skip the add-card step).
  skipPaymentMethod: boolean;
}

// GET /companies/:id/billing/coupons — active applied coupons.
export interface AppliedCoupon {
  code: string;
  name: string;
  amountCents: number | null;
  amountCentsRemaining: number | null;
  currency: string | null;
  percentageRate: string | null;
  frequency: CouponFrequency;
  frequencyDuration: number | null;
  frequencyDurationRemaining: number | null;
  expiresAt: string | null;
  appliedAt: string;
}
