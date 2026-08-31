// Control-plane types for the hostnsoft console.
// These mirror the hostnsoft-api data model exactly (see the API reference).
// The console talks to that API through the Next.js BFF proxy under /api/hns/*,
// so these shapes are the wire shapes the proxy passes through untouched.

export type Role = "company_admin" | "project_admin" | "viewer";
export type MemberStatus = "invited" | "active";

// hostnsoft-api deployment status. Only these three exist server-side.
export type DeploymentStatus = "success" | "failed" | "in_progress";

// Project health is always "unknown" today (no live Nomad status wired up).
export type ProjectHealth = "unknown";

// The logged-in user plus the companies they belong to. From GET /auth/me and
// the /auth/msg91/exchange response.
export interface CompanyMembershipSummary {
  companyId: string;
  companyName: string;
  role: Role;
  status?: MemberStatus;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface MeResponse extends AuthUser {
  companies: CompanyMembershipSummary[];
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

// A row from GET /companies — company plus the caller's role/status in it.
export interface CompanyWithRole extends Company {
  role: Role;
  status: MemberStatus;
}

// GET /companies/:id — detail with counts.
export interface CompanyDetail extends Company {
  role: Role;
  memberCount: number;
  projectCount: number;
}

export interface Member {
  userId: string;
  email: string;
  role: Role;
  status: MemberStatus;
}

export interface Project {
  id: string;
  companyId: string;
  slug: string;
  name: string;
  memoryMb: number;
  createdAt: string;
}

// GET one project adds a health field (always "unknown" for now).
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

// Normalized error shape the BFF returns for every failure.
export interface ApiError {
  error: string;
  details?: { path: string; message: string }[];
  status: number;
}
