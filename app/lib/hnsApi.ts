"use client";

// Typed client for hostnsoft-api — one function per documented endpoint,
// mirroring the API reference exactly. Everything goes through the BFF proxy
// (hns) at /api/hns/*, which attaches the session and normalizes errors.
//
// Auth/session endpoints (exchange, refresh, logout, me) are handled separately
// in client.ts + session.tsx because they manage cookies.

import { hns } from "./client";
import type {
  Company,
  CompanyDetail,
  CompanyWithRole,
  DeployToken,
  DeployTokenSecret,
  Deployment,
  EnvVar,
  Member,
  Project,
  ProjectDetail,
  Role,
} from "./types";

// ---------------------------------------------------------------- Companies
export const companiesApi = {
  // POST /companies — create a company (creator becomes company_admin).
  create: (name: string) =>
    hns<Company>("/companies", { method: "POST", body: { name } }),

  // GET /companies — every company the current user belongs to.
  list: () => hns<CompanyWithRole[]>("/companies"),

  // GET /companies/:companyId — one company's detail, with counts.
  get: (companyId: string) => hns<CompanyDetail>(`/companies/${companyId}`),

  // PATCH /companies/:companyId — rename (company_admin).
  rename: (companyId: string, name: string) =>
    hns<Company>(`/companies/${companyId}`, { method: "PATCH", body: { name } }),

  // DELETE /companies/:companyId — delete (company_admin; 409 if projects exist).
  remove: (companyId: string) =>
    hns<null>(`/companies/${companyId}`, { method: "DELETE" }),
};

// ------------------------------------------------------------------ Members
export const membersApi = {
  // POST /companies/:companyId/members — invite by email (company_admin).
  invite: (companyId: string, email: string, role: Role) =>
    hns<Member>(`/companies/${companyId}/members`, { method: "POST", body: { email, role } }),

  // GET /companies/:companyId/members — everyone in the company.
  list: (companyId: string) => hns<Member[]>(`/companies/${companyId}/members`),

  // PATCH /companies/:companyId/members/:userId — change role (company_admin;
  // 400 if it would leave zero company_admins).
  setRole: (companyId: string, userId: string, role: Role) =>
    hns<Member>(`/companies/${companyId}/members/${userId}`, { method: "PATCH", body: { role } }),

  // DELETE /companies/:companyId/members/:userId — remove (company_admin; same
  // zero-admin guard).
  remove: (companyId: string, userId: string) =>
    hns<null>(`/companies/${companyId}/members/${userId}`, { method: "DELETE" }),
};

// ----------------------------------------------------------------- Projects
export const projectsApi = {
  // POST /companies/:companyId/projects — create (project_admin; 409 if the
  // derived slug is taken platform-wide).
  create: (companyId: string, name: string) =>
    hns<Project>(`/companies/${companyId}/projects`, { method: "POST", body: { name } }),

  // GET /companies/:companyId/projects — all projects in the company.
  list: (companyId: string) => hns<Project[]>(`/companies/${companyId}/projects`),

  // GET /companies/:companyId/projects/:projectId — detail with health.
  get: (companyId: string, projectId: string) =>
    hns<ProjectDetail>(`/companies/${companyId}/projects/${projectId}`),

  // PATCH /companies/:companyId/projects/:projectId — rename display name only
  // (project_admin). Slug/URL never change.
  rename: (companyId: string, projectId: string, name: string) =>
    hns<Project>(`/companies/${companyId}/projects/${projectId}`, { method: "PATCH", body: { name } }),

  // PATCH /companies/:companyId/projects/:projectId/memory — set requested
  // memory in MB (project_admin). Applies on next deploy only.
  setMemory: (companyId: string, projectId: string, memoryMb: number) =>
    hns<Project>(`/companies/${companyId}/projects/${projectId}/memory`, { method: "PATCH", body: { memoryMb } }),

  // DELETE /companies/:companyId/projects/:projectId — delete the record
  // (project_admin; does not stop the running app yet).
  remove: (companyId: string, projectId: string) =>
    hns<null>(`/companies/${companyId}/projects/${projectId}`, { method: "DELETE" }),
};

// ------------------------------------------------------------- Env variables
export const envVarsApi = {
  // GET .../env-vars — list (project_admin). Values are plaintext; mask in UI.
  list: (companyId: string, projectId: string) =>
    hns<EnvVar[]>(`/companies/${companyId}/projects/${projectId}/env-vars`),

  // PUT .../env-vars — bulk upsert (project_admin). Keys omitted are left as-is.
  set: (companyId: string, projectId: string, vars: { key: string; value: string }[]) =>
    hns<EnvVar[]>(`/companies/${companyId}/projects/${projectId}/env-vars`, { method: "PUT", body: { vars } }),

  // DELETE .../env-vars/:key — remove one variable by key (project_admin).
  remove: (companyId: string, projectId: string, key: string) =>
    hns<null>(`/companies/${companyId}/projects/${projectId}/env-vars/${encodeURIComponent(key)}`, { method: "DELETE" }),
};

// -------------------------------------------------------------- Deploy tokens
export const tokensApi = {
  // POST /companies/:companyId/tokens — create; raw token returned once
  // (company_admin).
  create: (companyId: string, label: string) =>
    hns<DeployTokenSecret>(`/companies/${companyId}/tokens`, { method: "POST", body: { label } }),

  // GET /companies/:companyId/tokens — list (company_admin). Prefixes only.
  list: (companyId: string) => hns<DeployToken[]>(`/companies/${companyId}/tokens`),

  // DELETE /companies/:companyId/tokens/:tokenId — revoke immediately
  // (company_admin).
  revoke: (companyId: string, tokenId: string) =>
    hns<null>(`/companies/${companyId}/tokens/${tokenId}`, { method: "DELETE" }),

  // POST /companies/:companyId/tokens/:tokenId/rotate — issue a replacement;
  // old token valid 1h (company_admin). Returns the new raw token once.
  rotate: (companyId: string, tokenId: string) =>
    hns<DeployTokenSecret>(`/companies/${companyId}/tokens/${tokenId}/rotate`, { method: "POST" }),
};

// -------------------------------------------------------------- Deployments
export const deploymentsApi = {
  // GET .../deployments — deploy history, newest first.
  list: (companyId: string, projectId: string) =>
    hns<Deployment[]>(`/companies/${companyId}/projects/${projectId}/deployments`),
};
