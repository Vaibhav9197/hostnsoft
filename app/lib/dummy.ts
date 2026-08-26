// Dummy data source for the console. Swap this module for real DB/platform
// calls later — the API routes and screens consume only the exported helpers.

import type {
  AppDetail,
  AppSummary,
  ApiToken,
  Deployment,
  DeploymentEvent,
} from "./types";

export const WORKSPACE = { name: "Ashish’s workspace", slug: "ashish" };
export const USER = { name: "Ashish Yadav", email: "ashish@walkover.in" };

const APPS: AppSummary[] = [
  {
    id: "app_order_tracker",
    name: "order-tracker",
    status: "running",
    url: "https://order-tracker.hostnsoft.com",
    stack: "Node.js",
    hasDatabase: true,
    memoryMb: 512,
    currentVersion: "v2026.08.26",
    lastDeployAt: "2026-08-26T09:14:00Z",
    createdAt: "2026-08-02T11:00:00Z",
  },
  {
    id: "app_lead_intake",
    name: "lead-intake",
    status: "running",
    url: "https://lead-intake.hostnsoft.com",
    stack: "Python",
    hasDatabase: true,
    memoryMb: 512,
    currentVersion: "v0.4.1",
    lastDeployAt: "2026-08-24T16:40:00Z",
    createdAt: "2026-08-10T08:30:00Z",
  },
  {
    id: "app_expense_approvals",
    name: "expense-approvals",
    status: "building",
    url: "https://expense-approvals.hostnsoft.com",
    stack: "Node.js",
    hasDatabase: false,
    memoryMb: 256,
    currentVersion: "v12",
    lastDeployAt: "2026-08-26T10:02:00Z",
    createdAt: "2026-08-18T14:05:00Z",
  },
  {
    id: "app_feedback_wall",
    name: "feedback-wall",
    status: "crashed",
    url: "https://feedback-wall.hostnsoft.com",
    stack: "Node.js",
    hasDatabase: true,
    memoryMb: 256,
    currentVersion: "v7",
    lastDeployAt: "2026-08-25T19:22:00Z",
    createdAt: "2026-08-15T09:45:00Z",
  },
];

const DEPLOYMENTS: Record<string, Deployment[]> = {
  app_order_tracker: [
    {
      id: "dep_ot_5",
      appId: "app_order_tracker",
      version: "v2026.08.26",
      status: "live",
      url: "https://order-tracker.hostnsoft.com",
      detectedStack: "Node.js",
      sourceBytes: 1_842_000,
      trigger: "skill",
      createdBy: "Ashish Yadav",
      errorMessage: null,
      createdAt: "2026-08-26T09:12:30Z",
      finishedAt: "2026-08-26T09:14:00Z",
    },
    {
      id: "dep_ot_4",
      appId: "app_order_tracker",
      version: "v2026.08.19",
      status: "superseded",
      url: null,
      detectedStack: "Node.js",
      sourceBytes: 1_790_000,
      trigger: "skill",
      createdBy: "Ashish Yadav",
      errorMessage: null,
      createdAt: "2026-08-19T13:01:00Z",
      finishedAt: "2026-08-19T13:02:20Z",
    },
    {
      id: "dep_ot_3",
      appId: "app_order_tracker",
      version: "v2026.08.11",
      status: "superseded",
      url: null,
      detectedStack: "Node.js",
      sourceBytes: 1_701_000,
      trigger: "api",
      createdBy: "CI token",
      errorMessage: null,
      createdAt: "2026-08-11T10:20:00Z",
      finishedAt: "2026-08-11T10:21:40Z",
    },
  ],
  app_lead_intake: [
    {
      id: "dep_li_2",
      appId: "app_lead_intake",
      version: "v0.4.1",
      status: "live",
      url: "https://lead-intake.hostnsoft.com",
      detectedStack: "Python",
      sourceBytes: 980_000,
      trigger: "cli",
      createdBy: "Ashish Yadav",
      errorMessage: null,
      createdAt: "2026-08-24T16:38:30Z",
      finishedAt: "2026-08-24T16:40:00Z",
    },
    {
      id: "dep_li_1",
      appId: "app_lead_intake",
      version: "v0.4.0",
      status: "superseded",
      url: null,
      detectedStack: "Python",
      sourceBytes: 962_000,
      trigger: "cli",
      createdBy: "Ashish Yadav",
      errorMessage: null,
      createdAt: "2026-08-20T12:00:00Z",
      finishedAt: "2026-08-20T12:01:30Z",
    },
  ],
  app_expense_approvals: [
    {
      id: "dep_ea_12",
      appId: "app_expense_approvals",
      version: "v12",
      status: "building",
      url: null,
      detectedStack: "Node.js",
      sourceBytes: 640_000,
      trigger: "skill",
      createdBy: "Ashish Yadav",
      errorMessage: null,
      createdAt: "2026-08-26T10:01:10Z",
      finishedAt: null,
    },
    {
      id: "dep_ea_11",
      appId: "app_expense_approvals",
      version: "v11",
      status: "live",
      url: "https://expense-approvals.hostnsoft.com",
      detectedStack: "Node.js",
      sourceBytes: 631_000,
      trigger: "skill",
      createdBy: "Ashish Yadav",
      errorMessage: null,
      createdAt: "2026-08-25T09:30:00Z",
      finishedAt: "2026-08-25T09:31:20Z",
    },
  ],
  app_feedback_wall: [
    {
      id: "dep_fw_7",
      appId: "app_feedback_wall",
      version: "v7",
      status: "crashed",
      url: null,
      detectedStack: "Node.js",
      sourceBytes: 512_000,
      trigger: "skill",
      createdBy: "Ashish Yadav",
      errorMessage: "Process exited (code 137) — out of memory shortly after start.",
      createdAt: "2026-08-25T19:20:00Z",
      finishedAt: "2026-08-25T19:22:00Z",
    },
    {
      id: "dep_fw_6",
      appId: "app_feedback_wall",
      version: "v6",
      status: "superseded",
      url: null,
      detectedStack: "Node.js",
      sourceBytes: 505_000,
      trigger: "skill",
      createdBy: "Ashish Yadav",
      errorMessage: null,
      createdAt: "2026-08-22T15:00:00Z",
      finishedAt: "2026-08-22T15:01:10Z",
    },
  ],
};

const EVENTS: Record<string, DeploymentEvent[]> = {
  app_order_tracker: [
    { id: "e1", deploymentId: "dep_ot_5", phase: "package", level: "info", message: "Packaged order-tracker — no Dockerfile needed", createdAt: "2026-08-26T09:12:35Z" },
    { id: "e2", deploymentId: "dep_ot_5", phase: "build", level: "info", message: "Detected Node.js · installing dependencies", createdAt: "2026-08-26T09:12:50Z" },
    { id: "e3", deploymentId: "dep_ot_5", phase: "build", level: "info", message: "Detected @electric-sql/pglite — allocating 512 MB", createdAt: "2026-08-26T09:13:20Z" },
    { id: "e4", deploymentId: "dep_ot_5", phase: "deploy", level: "info", message: "Deployed v2026.08.26", createdAt: "2026-08-26T09:13:50Z" },
    { id: "e5", deploymentId: "dep_ot_5", phase: "verify", level: "info", message: "Verified running · 200 OK", createdAt: "2026-08-26T09:14:00Z" },
  ],
  app_expense_approvals: [
    { id: "e6", deploymentId: "dep_ea_12", phase: "package", level: "info", message: "Packaged expense-approvals — no Dockerfile needed", createdAt: "2026-08-26T10:01:15Z" },
    { id: "e7", deploymentId: "dep_ea_12", phase: "build", level: "info", message: "Detected Node.js · building image", createdAt: "2026-08-26T10:02:00Z" },
  ],
  app_feedback_wall: [
    { id: "e8", deploymentId: "dep_fw_7", phase: "package", level: "info", message: "Packaged feedback-wall — no Dockerfile needed", createdAt: "2026-08-25T19:20:05Z" },
    { id: "e9", deploymentId: "dep_fw_7", phase: "build", level: "info", message: "Detected Node.js · building image", createdAt: "2026-08-25T19:20:40Z" },
    { id: "e10", deploymentId: "dep_fw_7", phase: "deploy", level: "info", message: "Deployed v7", createdAt: "2026-08-25T19:21:20Z" },
    { id: "e11", deploymentId: "dep_fw_7", phase: "verify", level: "error", message: "Health check failed — process exited (code 137). Likely out of memory.", createdAt: "2026-08-25T19:22:00Z" },
  ],
};

const TOKENS: ApiToken[] = [
  {
    id: "tok_laptop",
    name: "My laptop",
    tokenPrefix: "hns_live_8f21",
    lastUsedAt: "2026-08-26T09:12:30Z",
    createdAt: "2026-08-02T11:05:00Z",
    revokedAt: null,
  },
  {
    id: "tok_ci",
    name: "CI token",
    tokenPrefix: "hns_live_2b7c",
    lastUsedAt: "2026-08-11T10:20:00Z",
    createdAt: "2026-08-05T09:00:00Z",
    revokedAt: null,
  },
];

export function listApps(): AppSummary[] {
  return APPS;
}

export function getApp(id: string): AppDetail | null {
  const app = APPS.find((a) => a.id === id);
  if (!app) return null;
  return {
    ...app,
    deployments: DEPLOYMENTS[id] ?? [],
    events: EVENTS[id] ?? [],
  };
}

export function listTokens(): ApiToken[] {
  return TOKENS.filter((t) => !t.revokedAt);
}
