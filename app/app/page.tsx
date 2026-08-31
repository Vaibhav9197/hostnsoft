"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { SkillDialog } from "../components/console/SkillDialog";
import { Alert, EmptyState, Page, PageHeader, Skeleton } from "../components/console/kit";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
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

      {creating && canWrite && (
        <form className="flex flex-wrap gap-2.5" onSubmit={createProject}>
          <Input
            className="min-w-[220px] flex-1"
            placeholder="Project name — e.g. Invoice Portal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoFocus
          />
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? "Creating…" : "Create"}
          </Button>
        </form>
      )}

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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/app/projects/${p.id}`}
              className="group flex min-h-[150px] flex-col gap-2.5 border border-border bg-card p-4.5 transition-all hover:-translate-y-0.5 hover:border-input"
            >
              <div className="flex items-center justify-between gap-2.5">
                <span className="font-mono text-[1.02rem] font-bold text-foreground">{p.name}</span>
              </div>
              <div className="truncate font-mono text-[0.85rem] text-muted-foreground">{p.slug}.app.hostnsoft.com</div>
              <div className="mt-auto flex items-center gap-2 text-[0.8rem] text-faint">
                <span className="font-mono">{p.memoryMb} MB</span>
                <span className="size-[3px] rounded-full bg-faint/60" />
                <span>Created {formatDate(p.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2.5">
                <span className="font-mono text-[0.78rem] text-faint">Added {relativeTime(p.createdAt)}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 text-faint transition-all group-hover:translate-x-0.5 group-hover:text-primary"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
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
