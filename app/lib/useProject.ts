"use client";

import { useCallback, useEffect, useState } from "react";
import { projectsApi } from "./hnsApi";
import type { ProjectDetail } from "./types";

// Shared fetcher for one project's detail, used by the project sidebar and each
// project sub-page so they stay in sync against the same endpoint.
export function useProject(companyId: string | null, projectId: string) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!companyId) return;
    try {
      const data = await projectsApi.get(companyId, projectId);
      setProject(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "This project couldn’t be found.");
    }
  }, [companyId, projectId]);

  useEffect(() => {
    setProject(null);
    setError(null);
    reload();
  }, [reload]);

  return { project, error, reload };
}
