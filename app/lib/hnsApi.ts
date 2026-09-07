"use client";

// Typed client for hostnsoft-api — one function per documented endpoint,
// mirroring the API reference exactly. Everything goes through the BFF proxy
// (hns) at /api/hns/*, which attaches the session and normalizes errors.
//
// Auth/session endpoints (exchange, logout, me) are handled separately
// in client.ts + session.tsx because they manage the session cookie.

import { hns } from "./client";
import type {
  BillingPlan,
  BillingStatus,
  BillingSubscription,
  Company,
  CompanyDetail,
  CompanyWithMembership,
  DeployToken,
  DeployTokenSecret,
  Deployment,
  EnvVar,
  Member,
  PaymentMethod,
  Project,
  ProjectDetail,
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
};

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
