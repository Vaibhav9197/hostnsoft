"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { membersApi } from "./hnsApi";
import { useSession } from "./session";
import type { MyPermissions, Permission, WorkspaceRole } from "./types";

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
  role: WorkspaceRole | null;
  data: MyPermissions | null;
  // Without projectId: may they do this anywhere in the workspace.
  // With it: may they do it to that app.
  can: (permission: Permission, projectId?: string) => boolean;
  reload: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsValue | null>(null);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { status, activeCompanyId, apiConnected } = useSession();
  const [data, setData] = useState<MyPermissions | null>(null);
  const enabled = status === "authed" && !!activeCompanyId && apiConnected;

  const read = useCallback(async () => {
    if (!enabled || !activeCompanyId) return;
    try {
      setData(await membersApi.myPermissions(activeCompanyId));
    } catch {
      // Leave everything allowed; the API still refuses what it must.
      setData(null);
    }
  }, [enabled, activeCompanyId]);

  useEffect(() => {
    setData(null);
    read();
  }, [read]);

  const value = useMemo<PermissionsValue>(() => {
    const byApp = new Map((data?.apps ?? []).map((a) => [a.projectId, new Set(a.permissions)]));
    const workspace = new Set(data?.permissions ?? []);
    return {
      loaded: !!data,
      role: data?.role ?? null,
      data,
      can: (permission, projectId) => {
        if (!data) return true;
        if (!projectId) return workspace.has(permission);
        return byApp.get(projectId)?.has(permission) ?? false;
      },
      reload: read,
    };
  }, [data, read]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions(): PermissionsValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions must be used inside PermissionsProvider");
  return ctx;
}

// The words the panel uses for each role, and what each one means in one line.
export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  developer: "Developer",
  viewer: "Viewer",
  billing: "Billing",
};

export const ROLE_HINTS: Record<WorkspaceRole, string> = {
  owner: "Everything, including billing and who the owners are.",
  admin: "Everything except billing and owners.",
  developer: "Deploys and changes apps they have access to.",
  viewer: "Sees status, logs and history. Can't change anything.",
  billing: "Plan and billing only. No apps.",
};
