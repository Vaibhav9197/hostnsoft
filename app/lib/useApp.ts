"use client";

import { useEffect, useState } from "react";
import type { AppDetail } from "./types";

// Shared fetcher for a single app's detail, used by the app-scoped sidebar and
// each app sub-page so they stay in sync against /api/apps/:id.
export function useApp(appId: string) {
  const [app, setApp] = useState<AppDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setApp(null);
    setError(null);
    fetch(`/api/apps/${appId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("This app couldn’t be found."))))
      .then((d) => live && setApp(d.app))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [appId]);

  return { app, error };
}
