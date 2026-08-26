// Control-plane types for the hostnsoft console.
// These mirror the data model in the MVP PRD (§07). For now the API routes
// serve dummy data shaped exactly like this, so screens won't change when a
// real backend replaces the dummy source.

export type AppStatus = "running" | "building" | "crashed" | "sleeping" | "failed";

export type DeploymentStatus =
  | "queued"
  | "building"
  | "deploying"
  | "live"
  | "failed"
  | "crashed"
  | "superseded"
  | "rolled_back";

export type DeployTrigger = "skill" | "api" | "cli" | "redeploy" | "rollback";

export type EventPhase = "package" | "build" | "deploy" | "verify";
export type EventLevel = "info" | "warn" | "error";

export interface AppSummary {
  id: string;
  name: string;
  status: AppStatus;
  url: string | null;
  stack: string | null;
  hasDatabase: boolean;
  memoryMb: number | null;
  currentVersion: string | null;
  lastDeployAt: string | null;
  createdAt: string;
}

export interface DeploymentEvent {
  id: string;
  deploymentId: string;
  phase: EventPhase;
  level: EventLevel;
  message: string;
  createdAt: string;
}

export interface Deployment {
  id: string;
  appId: string;
  version: string;
  status: DeploymentStatus;
  url: string | null;
  detectedStack: string | null;
  sourceBytes: number | null;
  trigger: DeployTrigger;
  createdBy: string | null;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface AppDetail extends AppSummary {
  deployments: Deployment[];
  events: DeploymentEvent[];
}

export interface ApiToken {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface EnvVar {
  key: string;
  value: string;
  secret: boolean;
  updatedAt: string;
}

export type DomainStatus = "active" | "pending" | "error";

export interface Domain {
  id: string;
  hostname: string;
  primary: boolean;
  status: DomainStatus;
  cnameTarget: string;
  createdAt: string;
}
