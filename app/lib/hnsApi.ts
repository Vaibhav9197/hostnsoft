"use client";

// Typed client for hostnsoft-api — one function per documented endpoint,
// mirroring the API reference exactly. Everything goes through the BFF proxy
// (hns) at /api/hns/*, which attaches the session and normalizes errors.
//
// Auth/session endpoints (exchange, logout, me) are handled separately
// in client.ts + session.tsx because they manage the session cookie.

import { HnsError, hns } from "./client";
import type {
  AdminShowcaseCollectionPage,
  AdminShowcaseListingPage,
  AnalyticsRange,
  AppLogs,
  BillingPlan,
  BillingStatus,
  BillingSubscription,
  Company,
  CompanyDetail,
  CompanyWithMembership,
  DeployToken,
  DeployTokenSecret,
  Deployment,
  Domain,
  EnvVar,
  LogStream,
  Member,
  PaymentMethod,
  Project,
  ProjectAnalytics,
  ProjectDetail,
  ShowcaseCollection,
  ShowcaseCollectionDetail,
  ShowcaseListing,
  ShowcasePage,
  ShowcaseType,
  ShowcaseSubmissionInput,
  SlugChangeAccepted,
  SlugChangeStatus,
} from "./types";

// ---------------------------------------------------------------- Companies
export const companiesApi = {
  // POST /companies — create a company.
  create: (name: string) =>
    hns<Company>("/companies", { method: "POST", body: { name } }),

  // GET /companies — every company the current user belongs to.
  list: () => hns<CompanyWithMembership[]>("/companies"),

  // GET /companies/:companyId — one company's detail, with counts.
  get: (companyId: string) => hns<CompanyDetail>(`/companies/${companyId}`),

  // PATCH /companies/:companyId — rename.
  rename: (companyId: string, name: string) =>
    hns<Company>(`/companies/${companyId}`, { method: "PATCH", body: { name } }),

  // DELETE /companies/:companyId — delete (409 if projects exist).
  remove: (companyId: string) =>
    hns<null>(`/companies/${companyId}`, { method: "DELETE" }),
};

// ------------------------------------------------------------------ Members
export const membersApi = {
  // POST /companies/:companyId/members — invite by email.
  invite: (companyId: string, email: string) =>
    hns<Member>(`/companies/${companyId}/members`, { method: "POST", body: { email } }),

  // GET /companies/:companyId/members — everyone in the company.
  list: (companyId: string) => hns<Member[]>(`/companies/${companyId}/members`),

  // DELETE /companies/:companyId/members/:userId — remove a member.
  remove: (companyId: string, userId: string) =>
    hns<null>(`/companies/${companyId}/members/${userId}`, { method: "DELETE" }),
};

// ----------------------------------------------------------------- Projects
export const appsApi = {
  // GET /apps/:slug/logs — tail of the running app's stdout (or stderr).
  // Keyed by slug, not project id, and scoped to the live allocation rather
  // than to a deployment.
  //
  // Note the route: this one lives on the deploy endpoint's root, not under
  // the management API, so it has its own BFF route instead of going through
  // the generic /api/hns proxy.
  logs: async (slug: string, stream: LogStream = "stdout"): Promise<AppLogs> => {
    const res = await fetch(`/api/apps/${encodeURIComponent(slug)}/logs?stream=${stream}`);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new HnsError(
        (data && typeof data.error === "string" && data.error) || "Couldn’t load logs.",
        res.status,
      );
    }
    return data as AppLogs;
  },
};

export const projectsApi = {
  // POST /companies/:companyId/projects — create (409 if the derived slug is
  // taken platform-wide).
  create: (companyId: string, name: string) =>
    hns<Project>(`/companies/${companyId}/projects`, { method: "POST", body: { name } }),

  // GET /companies/:companyId/projects — all projects in the company.
  list: (companyId: string) => hns<Project[]>(`/companies/${companyId}/projects`),

  // GET /companies/:companyId/projects/:projectId — detail with health.
  get: (companyId: string, projectId: string) =>
    hns<ProjectDetail>(`/companies/${companyId}/projects/${projectId}`),

  // PATCH /companies/:companyId/projects/:projectId — rename display name
  // only. Slug/URL never change.
  rename: (companyId: string, projectId: string, name: string) =>
    hns<Project>(`/companies/${companyId}/projects/${projectId}`, { method: "PATCH", body: { name } }),

  // PATCH /companies/:companyId/projects/:projectId/slug — change the app's
  // web address. The old address stops working immediately and the freed
  // name is re-claimable. Sends the slug literally — the API validates
  // rather than slugifies, so don't "help" by transforming it here.
  //
  // TWO shapes of success, because the two cases genuinely differ. An app
  // that never deployed is done when this resolves, and answers with the
  // updated Project. A live one is a migration measured in minutes, so it
  // answers 202 {moving: true, ...} and the real outcome has to be polled
  // from slugChangeStatus below. Check `moving` before trusting the body
  // to be a Project.
  //
  // Error `code`s worth branching on: app_name_taken, app_name_reserved,
  // invalid_app_name, app_name_too_short, app_name_too_long,
  // deploy_in_progress, no_current_deployment, slug_change_cooldown,
  // rename_in_progress, app_state_unknown.
  changeSlug: (companyId: string, projectId: string, slug: string) =>
    hns<Project | SlugChangeAccepted>(`/companies/${companyId}/projects/${projectId}/slug`, {
      method: "PATCH",
      body: { slug },
    }),

  // GET /companies/:companyId/projects/:projectId/slug — outcome of a live
  // address change. 404 (HnsError, code "no_rename") once the server has
  // forgotten it, which for a caller that has been polling means it should
  // fall back to reading the project's current slug.
  slugChangeStatus: (companyId: string, projectId: string) =>
    hns<SlugChangeStatus>(`/companies/${companyId}/projects/${projectId}/slug`),

  // PATCH /companies/:companyId/projects/:projectId/memory — set requested
  // memory in MB. Applies on next deploy only.
  setMemory: (companyId: string, projectId: string, memoryMb: number) =>
    hns<Project>(`/companies/${companyId}/projects/${projectId}/memory`, { method: "PATCH", body: { memoryMb } }),

  // DELETE /companies/:companyId/projects/:projectId — delete the record
  // (does not stop the running app yet).
  remove: (companyId: string, projectId: string) =>
    hns<null>(`/companies/${companyId}/projects/${projectId}`, { method: "DELETE" }),
};

// ------------------------------------------------------------- Env variables
export const envVarsApi = {
  // GET .../env-vars — list. Values are plaintext; mask in UI.
  list: (companyId: string, projectId: string) =>
    hns<EnvVar[]>(`/companies/${companyId}/projects/${projectId}/env-vars`),

  // PUT .../env-vars — bulk upsert. Keys omitted are left as-is.
  set: (companyId: string, projectId: string, vars: { key: string; value: string }[]) =>
    hns<EnvVar[]>(`/companies/${companyId}/projects/${projectId}/env-vars`, { method: "PUT", body: { vars } }),

  // DELETE .../env-vars/:key — remove one variable by key.
  remove: (companyId: string, projectId: string, key: string) =>
    hns<null>(`/companies/${companyId}/projects/${projectId}/env-vars/${encodeURIComponent(key)}`, { method: "DELETE" }),
};

// -------------------------------------------------------------- Deploy tokens
export const tokensApi = {
  // POST /companies/:companyId/tokens — create; raw token returned once.
  create: (companyId: string, label: string) =>
    hns<DeployTokenSecret>(`/companies/${companyId}/tokens`, { method: "POST", body: { label } }),

  // GET /companies/:companyId/tokens — list. Prefixes only.
  list: (companyId: string) => hns<DeployToken[]>(`/companies/${companyId}/tokens`),

  // DELETE /companies/:companyId/tokens/:tokenId — revoke immediately.
  revoke: (companyId: string, tokenId: string) =>
    hns<null>(`/companies/${companyId}/tokens/${tokenId}`, { method: "DELETE" }),

  // POST /companies/:companyId/tokens/:tokenId/rotate — issue a replacement;
  // old token valid 1h. Returns the new raw token once.
  rotate: (companyId: string, tokenId: string) =>
    hns<DeployTokenSecret>(`/companies/${companyId}/tokens/${tokenId}/rotate`, { method: "POST" }),
};

// -------------------------------------------------------------- Deployments
export const deploymentsApi = {
  // GET .../deployments — deploy history, newest first.
  list: (companyId: string, projectId: string) =>
    hns<Deployment[]>(`/companies/${companyId}/projects/${projectId}/deployments`),

  // POST .../deployments/:deploymentId/rollback — put an earlier deploy back in
  // service. A pointer flip onto the image that deploy already built, so it
  // takes seconds and never rebuilds; custom domains and env vars are left
  // exactly as they are. History isn't rewritten: this lands as a brand-new
  // deployment (its own version, `triggeredBy` prefixed "rollback:"), which is
  // what comes back. 422 if the target never succeeded or has no image.
  rollback: (companyId: string, projectId: string, deploymentId: string) =>
    hns<Deployment>(
      `/companies/${companyId}/projects/${projectId}/deployments/${deploymentId}/rollback`,
      { method: "POST" },
    ),
};

// ------------------------------------------------------------- Custom domains
// Registering a domain only records it and hands back the DNS record to create;
// nothing is live until a verify resolves that record.
export const domainsApi = {
  // GET .../domains — every custom domain attached to this project.
  list: (companyId: string, projectId: string) =>
    hns<Domain[]>(`/companies/${companyId}/projects/${projectId}/domains`),

  // POST .../domains — register in pending_dns and return the record to add.
  // Nothing is verified or activated here.
  register: (companyId: string, projectId: string, domain: string) =>
    hns<Domain>(`/companies/${companyId}/projects/${projectId}/domains`, { method: "POST", body: { domain } }),

  // POST .../domains/:domain/verify — check DNS live and, if it resolves,
  // activate routing immediately (no rebuild). Safe to call repeatedly while
  // DNS propagates.
  //
  // A 422 here is the expected "not ready yet" answer, not a transport failure:
  // its body is the same domain shape, carrying the record to try again with.
  // Hand it back so the caller renders one flow instead of two.
  verify: async (companyId: string, projectId: string, domain: string): Promise<Domain> => {
    const path = `/companies/${companyId}/projects/${projectId}/domains/${encodeURIComponent(domain)}/verify`;
    try {
      return await hns<Domain>(path, { method: "POST" });
    } catch (e) {
      if (e instanceof HnsError && e.status === 422 && isDomain(e.payload)) return e.payload;
      throw e;
    }
  },

  // DELETE .../domains/:domain — tear down this domain's router and cert. The
  // project's default platform subdomain is never touched.
  remove: (companyId: string, projectId: string, domain: string) =>
    hns<null>(`/companies/${companyId}/projects/${projectId}/domains/${encodeURIComponent(domain)}`, {
      method: "DELETE",
    }),
};

function isDomain(v: unknown): v is Domain {
  return typeof v === "object" && v !== null && typeof (v as Domain).domain === "string" && typeof (v as Domain).status === "string";
}

// ------------------------------------------------------------------ Billing
// Lago + Stripe via hostnsoft-api (docs/billing.md there). Everything is
// per company except the plan catalogue, which is org-wide.
export const billingApi = {
  // GET /billing/plans — the public plans, in display order.
  plans: () => hns<BillingPlan[]>("/billing/plans"),

  // GET /companies/:companyId/billing — live subscriptions with their plans.
  // An empty list means billing hasn't been set up for the company yet.
  status: (companyId: string) => hns<BillingStatus>(`/companies/${companyId}/billing`),

  // POST /companies/:companyId/billing/customer — create the Lago customer
  // (and, through it, the Stripe customer) and start on the free plan.
  setup: (companyId: string, body: { name: string; email: string }) =>
    hns<{ subscription: BillingSubscription }>(`/companies/${companyId}/billing/customer`, { method: "POST", body }),

  // GET .../payment-methods — saved cards from Stripe. 404 = no customer,
  // 409 BILLING_PROVIDER_NOT_LINKED = Stripe customer not created yet.
  paymentMethods: (companyId: string) =>
    hns<PaymentMethod[]>(`/companies/${companyId}/billing/payment-methods`),

  // GET .../checkout-url — short-lived, single-use Stripe page to add a card.
  checkoutUrl: (companyId: string) =>
    hns<{ checkoutUrl: string }>(`/companies/${companyId}/billing/checkout-url`),

  // DELETE .../payment-methods/:id — detach a saved card.
  removePaymentMethod: (companyId: string, paymentMethodId: string) =>
    hns<null>(`/companies/${companyId}/billing/payment-methods/${encodeURIComponent(paymentMethodId)}`, {
      method: "DELETE",
    }),

  // PUT .../subscription — change plan. Upgrades apply now; downgrades at
  // period end (shows as a "pending" subscription until then).
  changePlan: (companyId: string, planCode: string) =>
    hns<BillingSubscription>(`/companies/${companyId}/billing/subscription`, {
      method: "PUT",
      body: { plan_code: planCode },
    }),

  // DELETE .../subscription — cancel = move back to the free plan.
  cancel: (companyId: string) =>
    hns<BillingSubscription>(`/companies/${companyId}/billing/subscription`, { method: "DELETE" }),
};

// ----------------------------------------------------- Customer queries
export const customerQueryApi = {
  // POST /companies/:companyId/customer-query — feedback from a signed-in
  // user. The API takes the email from the verified session, so don't send one;
  // these land under "Dashboard Queries" in /admin.
  create: (companyId: string, type: "feature" | "feedback", message: string) =>
    hns<{ id: string }>(`/companies/${companyId}/customer-query`, {
      method: "POST",
      body: { type, message },
    }),
};

// ---------------------------------------------------------------- Analytics
export const analyticsApi = {
  // GET /companies/:companyId/projects/:projectId/analytics — traffic and
  // resource usage over `range`. The series arrive pre-bucketed for charting
  // (hourly for 24h, 6-hourly for 7d, daily above that), so nothing here
  // re-buckets them.
  //
  // A 503 from this endpoint means the analytics pipeline is unreachable, not
  // that the app is idle — an idle app answers 200 with zeroes. Callers must
  // keep those apart; see ANALYTICS_UNAVAILABLE below.
  project: (companyId: string, projectId: string, range: AnalyticsRange = "24h") =>
    hns<ProjectAnalytics>(
      `/companies/${companyId}/projects/${projectId}/analytics?range=${range}`,
    ),
};

/** The status that means "pipeline down", as distinct from "no traffic". */
export const ANALYTICS_UNAVAILABLE = 503;

// ----------------------------------------------------------------- Showcase
// hostnsoft-api docs/showcase.md. A company is ORGANISER of its own pages
// and SUBMITTER of its apps onto any public board.
export const showcaseApi = {
  // ---- organiser
  // GET /companies/:companyId/showcase/collections — owned pages, company page first.
  listCollections: (companyId: string) =>
    hns<ShowcaseCollection[]>(`/companies/${companyId}/showcase/collections`),

  // POST /companies/:companyId/showcase/collections — create a public board. 409 SHOWCASE_SLUG_TAKEN.
  createCollection: (
    companyId: string,
    body: { slug: string; title: string; intro?: string | null; customHtml?: string | null },
  ) => hns<ShowcaseCollection>(`/companies/${companyId}/showcase/collections`, { method: "POST", body }),

  // GET .../collections/:collectionId — plus everything listed under it.
  getCollection: (companyId: string, collectionId: string) =>
    hns<ShowcaseCollectionDetail>(`/companies/${companyId}/showcase/collections/${collectionId}`),

  // DELETE .../collections/:collectionId — public boards only, while empty (409 otherwise).
  removeCollection: (companyId: string, collectionId: string) =>
    hns<null>(`/companies/${companyId}/showcase/collections/${collectionId}`, { method: "DELETE" }),

  // PATCH .../collections/:collectionId/projects/:listingId — hide/unhide a listing.
  setListingPrivate: (companyId: string, collectionId: string, listingId: string, isPrivate: boolean) =>
    hns<ShowcaseListing>(`/companies/${companyId}/showcase/collections/${collectionId}/projects/${listingId}`, {
      method: "PATCH",
      body: { isPrivate },
    }),

  // Same route with {approve:true} / {reject:true, reason?} — review a pending listing.
  approveListing: (companyId: string, collectionId: string, listingId: string) =>
    hns<ShowcaseListing>(`/companies/${companyId}/showcase/collections/${collectionId}/projects/${listingId}`, {
      method: "PATCH",
      body: { approve: true },
    }),
  rejectListing: (companyId: string, collectionId: string, listingId: string, reason?: string) =>
    hns<ShowcaseListing>(`/companies/${companyId}/showcase/collections/${collectionId}/projects/${listingId}`, {
      method: "PATCH",
      body: { reject: true, reason: reason || undefined },
    }),

  // Same route with {remove:true} — take a listing off this page for good.
  removeListing: (companyId: string, collectionId: string, listingId: string) =>
    hns<null>(`/companies/${companyId}/showcase/collections/${collectionId}/projects/${listingId}`, {
      method: "PATCH",
      body: { remove: true },
    }),

  // ---- submitter
  // GET /companies/:companyId/showcase/pages — every page this company may list on.
  listPages: (companyId: string) => hns<ShowcasePage[]>(`/companies/${companyId}/showcase/pages`),

  // GET /public/showcase/collections/:slug — resolve a typed slug. Open; 404 if unknown.
  lookupPage: (slug: string) =>
    hns<{ collection: ShowcasePage }>(`/public/showcase/collections/${encodeURIComponent(slug)}`).then((r) => r.collection),

  // POST /companies/:companyId/showcase/submissions — list an app; live at once.
  // 404 SHOWCASE_COLLECTION_UNKNOWN, 403 SHOWCASE_COLLECTION_PRIVATE, 409 SHOWCASE_ALREADY_LISTED.
  submit: (companyId: string, body: ShowcaseSubmissionInput) =>
    hns<ShowcaseListing>(`/companies/${companyId}/showcase/submissions`, { method: "POST", body }),

  // GET /companies/:companyId/showcase/submissions?projectId= — this company's listings, or one app's.
  listMySubmissions: (companyId: string, projectId?: string) =>
    hns<ShowcaseListing[]>(
      `/companies/${companyId}/showcase/submissions${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`
    ),

  // DELETE /companies/:companyId/showcase/submissions/:listingId — withdraw.
  withdraw: (companyId: string, listingId: string) =>
    hns<null>(`/companies/${companyId}/showcase/submissions/${listingId}`, { method: "DELETE" }),
};

// Super-admin oversight; nothing is approved here. Every route 404s for non-admins.
export const adminShowcaseApi = {
  // GET /admin/showcase/collections — paginated, newest first.
  listCollections: (params: { type?: ShowcaseType; page?: number; limit?: number; q?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.type) q.set("type", params.type);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.q) q.set("q", params.q);
    const qs = q.toString();
    return hns<AdminShowcaseCollectionPage>(`/admin/showcase/collections${qs ? `?${qs}` : ""}`);
  },

  // GET /admin/showcase/projects — every listing, for oversight and featuring.
  listProjects: (params: { collectionId?: string; page?: number; limit?: number; q?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.collectionId) q.set("collectionId", params.collectionId);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    if (params.q) q.set("q", params.q);
    const qs = q.toString();
    return hns<AdminShowcaseListingPage>(`/admin/showcase/projects${qs ? `?${qs}` : ""}`);
  },

  // PATCH /admin/showcase/projects/:id {featured}
  setFeatured: (id: string, featured: boolean) =>
    hns<ShowcaseListing>(`/admin/showcase/projects/${id}`, { method: "PATCH", body: { featured } }),
};
