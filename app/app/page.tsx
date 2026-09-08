"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { CloudBackdrop } from "../components/console/CloudBackdrop";
import { Alert, EmptyState, Page, PageHeader, Skeleton } from "../components/console/kit";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { DeployPromptDialog } from "../components/console/DeployPromptDialog";
import { HnsError } from "../lib/client"; // used by the parked createProject below
import { companiesApi, projectsApi } from "../lib/hnsApi";
import { formatDate, relativeTime } from "../lib/format";
import { useSession } from "../lib/session";
import type { Project } from "../lib/types";

export default function ProjectsPage() {
  const { activeCompanyId, companies, reload } = useSession();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // Parked with the name field and createProject below.
  // const [name, setName] = useState("");
  // const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!activeCompanyId) {
      setProjects([]);
      return;
    }
    setProjects(null);
    setError(null);
    try {
      const data = await projectsApi.list(activeCompanyId);
      setProjects(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load your apps.");
    }
  }, [activeCompanyId]);

  useEffect(() => {
    load();
  }, [load]);

  /* Parked, not deleted: apps are created by deploying to them, so the dialog
     hands over the prompt instead of a name field. Restore this together with
     the input and its state above if naming-up-front comes back.

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    setBusy(true);
    setError(null);
    try {
      const project = await projectsApi.create(activeCompanyId, name.trim());
      setProjects((p) => [project, ...(p ?? [])]);
      setName("");
      setCreating(false);
    } catch (e) {
      setError(e instanceof HnsError ? e.message : "Couldn’t create the app.");
    } finally {
      setBusy(false);
    }
  }
  */

  // No company yet — offer to create one.
  if (companies.length === 0) {
    return <NoCompany onCreated={reload} />;
  }

  return (
    <Page>
      {/* Only the projects list gets the sky — the rest of the console stays plain. */}
      <CloudBackdrop />

      <PageHeader
        title="Apps"
        subtitle="Every app deployed under this company."
        actions={
          <Button onClick={() => setCreating((v) => !v)}>
            <Plus />
            New app
          </Button>
        }
      />

      {/* Parked with createProject: naming an app up front is gone for now,
          because the deploy is what creates it.

      <Input
        placeholder="App name — e.g. Invoice Portal"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
        autoFocus
      />
      */}

      <DeployPromptDialog
        open={creating}
        onClose={() => setCreating(false)}
        title="New app"
        description="Copy this and paste it into your AI agent. It deploys your app, and the app shows up here on its own subdomain — nothing to fill in first."
      />

      {error && <Alert>{error}</Alert>}

      {!projects && !error && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
          {[0, 1, 2].map((i) => <Skeleton className="min-h-[150px]" key={i} aria-hidden="true" />)}
        </div>
      )}

      {projects && projects.length === 0 && (
        <EmptyState title="No apps yet">
          Create an app above, then deploy to its subdomain.
        </EmptyState>
      )}

      {projects && projects.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/app/projects/${p.id}`}
              className="group flex flex-col gap-3.5 rounded-lg border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-input hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <h3 className="text-base font-bold text-foreground truncate">{p.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{p.slug}.app.embarko.ai</p>
                </div>
                <div className="size-10 shrink-0 grid place-items-center rounded-md bg-muted text-primary font-semibold text-sm">
                  {p.name.charAt(0).toUpperCase()}
                </div>
              </div>

              <div className="flex items-center gap-3 py-2.5 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-faint bg-muted px-2 py-1 rounded">{p.memoryMb} MB</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-faint">Created {formatDate(p.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-faint">Added {relativeTime(p.createdAt)}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 text-muted-foreground transition-all duration-200 group-hover:translate-x-1 group-hover:text-primary"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}

function NoCompany({ onCreated }: { onCreated: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await companiesApi.create(name.trim());
      await onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t create the company.");
      setBusy(false);
    }
  }

  return (
    <Page>
      <PageHeader title="Welcome to Embarko" subtitle="Create a company to hold your apps and team." />
      {error && <Alert>{error}</Alert>}
      <form className="flex flex-wrap gap-2.5" onSubmit={create}>
        <Input
          className="min-w-[220px] flex-1"
          placeholder="Company name — e.g. Acme Robotics"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoFocus
        />
        <Button type="submit" disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create company"}</Button>
      </form>
    </Page>
  );
}
