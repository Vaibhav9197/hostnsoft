"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { SkillDialog } from "../components/console/SkillDialog";
import { Alert, EmptyState, Page, PageHeader, Skeleton } from "../components/console/kit";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { HnsError } from "../lib/client";
import { companiesApi, projectsApi } from "../lib/hnsApi";
import { formatDate, relativeTime } from "../lib/format";
import { atLeast, useSession } from "../lib/session";
import type { Project } from "../lib/types";

export default function ProjectsPage() {
  const { activeCompanyId, companies, role, reload } = useSession();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skillOpen, setSkillOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const canWrite = atLeast(role, "project_admin");

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
      setError(e instanceof Error ? e.message : "Couldn’t load your projects.");
    }
  }, [activeCompanyId]);

  useEffect(() => {
    load();
  }, [load]);

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
      setError(e instanceof HnsError ? e.message : "Couldn’t create the project.");
    } finally {
      setBusy(false);
    }
  }

  // No company yet — offer to create one.
  if (companies.length === 0) {
    return <NoCompany onCreated={reload} />;
  }

  return (
    <Page>
      <PageHeader
        title="Projects"
        subtitle="Every app deployed under this company."
        actions={
          <>
            <Button variant="outline" onClick={() => setSkillOpen(true)}>How to deploy</Button>
            {canWrite && (
              <Button onClick={() => setCreating((v) => !v)}>
                <Plus />
                New project
              </Button>
            )}
          </>
        }
      />

      <SkillDialog open={skillOpen} onClose={() => setSkillOpen(false)} />

      <Dialog open={creating} onOpenChange={(o) => { if (!o) setCreating(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Create a new project to deploy your app. Each project gets its own subdomain.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createProject} className="flex flex-col gap-4">
            <Input
              placeholder="Project name — e.g. Invoice Portal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" type="button" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !name.trim()}>
                {busy ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {error && <Alert>{error}</Alert>}

      {!projects && !error && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
          {[0, 1, 2].map((i) => <Skeleton className="min-h-[150px]" key={i} aria-hidden="true" />)}
        </div>
      )}

      {projects && projects.length === 0 && (
        <EmptyState title="No projects yet">
          {canWrite ? "Create a project above, then deploy to its subdomain." : "Ask a project admin to create the first project."}
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
                  <p className="text-sm text-muted-foreground truncate">{p.slug}.app.hostnsoft.com</p>
                </div>
                <div className="size-10 shrink-0 grid place-items-center rounded-md bg-primary/10 text-primary font-semibold text-sm">
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
      <PageHeader title="Welcome to hostnsoft" subtitle="Create a company to hold your projects and team." />
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
