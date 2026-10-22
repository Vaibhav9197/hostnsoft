"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { membersApi } from "./hnsApi";
import { useSession } from "./session";
import type { AccessLevel, MyPermissions, Permission, WorkspaceRole } from "./types";

// What the signed-in person may do in the active workspace, loaded once per
// workspace and shared by the menu, the members page and the app pages — so
// they can hide what the person can't do instead of offering a button that
// only ends in "you don't have permission".
//
// Presentation only: the API checks every one of these itself.
//
// Until the answer arrives, everything reads as allowed. Most people are
// Owners or Admins, and hiding then showing their controls on every page load
// would be the worse flicker; the few who are limited see a control for a
// moment that the API would refuse anyway.

interface PermissionsValue {
  loaded: boolean;
  // The answer has come back, or there won't be one (the read failed, or
  // there's no workspace). A page whose first request would only end in
  // "you don't have permission" waits for this instead of firing it while
  // can() still reads "allowed" — see NeedsPermission.
  settled: boolean;
  role: WorkspaceRole | null;
  data: MyPermissions | null;
  // Without projectId: may they do this anywhere in the workspace.
  // With it: may they do it to that app.
  can: (permission: Permission, projectId?: string) => boolean;
  // Their access to one app, or null when it's unknown (not loaded yet, or
  // the read failed) or they have none.
  levelOf: (projectId: string) => AccessLevel | null;
  reload: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsValue | null>(null);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { status, activeCompanyId, apiConnected } = useSession();
  const [data, setData] = useState<MyPermissions | null>(null);
  // Which workspace the last finished read was for (null = none yet).
  const [readFor, setReadFor] = useState<string | null>(null);
  const enabled = status === "authed" && !!activeCompanyId && apiConnected;

  const read = useCallback(async () => {
    if (!enabled || !activeCompanyId) return;
    try {
      setData(await membersApi.myPermissions(activeCompanyId));
    } catch {
      // Leave everything allowed; the API still refuses what it must.
      setData(null);
    } finally {
      setReadFor(activeCompanyId);
    }
  }, [enabled, activeCompanyId]);

  useEffect(() => {
    setData(null);
    setReadFor(null);
    read();
  }, [read]);

  const settled = status !== "loading" && (!enabled || readFor === activeCompanyId);

  const value = useMemo<PermissionsValue>(() => {
    const byApp = new Map((data?.apps ?? []).map((a) => [a.projectId, new Set(a.permissions)]));
    const levels = new Map((data?.apps ?? []).map((a) => [a.projectId, a.level]));
    const workspace = new Set(data?.permissions ?? []);
    return {
      loaded: !!data,
      settled,
      role: data?.role ?? null,
      data,
      can: (permission, projectId) => {
        if (!data) return true;
        if (!projectId) return workspace.has(permission);
        return byApp.get(projectId)?.has(permission) ?? false;
      },
      levelOf: (projectId) => levels.get(projectId) ?? null,
      reload: read,
    };
  }, [data, settled, read]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions(): PermissionsValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions must be used inside PermissionsProvider");
  return ctx;
}

// The words the panel uses for each role, and what each one means in one line.
export const ROLES: WorkspaceRole[] = ["owner", "admin", "member", "billing"];

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  billing: "Billing",
};

export const ROLE_HINTS: Record<WorkspaceRole, string> = {
  owner: "Everything, including billing and who the Owners and Admins are.",
  admin: "Everything, including billing and every app. Only an Owner can change Owners and Admins.",
  member: "Can use every app, add new ones and invite people. More access to particular apps when you give it.",
  billing: "Plan and billing only. No apps.",
};

// Access to one app, lowest first. Each includes everything above it in
// this list (hostnsoft-api lib/permissions.ts ACCESS_LEVELS). Told apart by
// what happens to the live app.
export const ACCESS_LEVELS: AccessLevel[] = ["use", "edit", "full"];

// What a Member has on an app nobody gave them more access to.
export const DEFAULT_LEVEL: AccessLevel = "use";

export const LEVEL_LABELS: Record<AccessLevel, string> = {
  use: "Can use",
  edit: "Can edit",
  full: "Full access",
};

// "Can edit" changes go to a preview someone with Full access approves.
// Previews aren't built yet, so today that AI's publishes are refused.
export const LEVEL_HINTS: Record<AccessLevel, string> = {
  use: "Open and use it, see its Context and history, comment. Nothing changes on the live app.",
  edit: "Also their AI prepares changes for someone with Full access to approve, and reads logs. The live app doesn't change until then.",
  full: "Also approve and publish, restore a version, settings, secrets and domains, share, move or delete it.",
};

// The one-line rule shown wherever a level is picked.
export const LEVEL_RULE =
  "Should this person’s AI be able to change the app? No → Can use. Yes, but someone checks first → Can edit. Yes, and they sign off → Full access.";
