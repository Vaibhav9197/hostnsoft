"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SkillDialog } from "../components/console/SkillDialog";
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
    <div className="con-page">
      <div className="con-head">
        <div>
          <h1 className="con-h1">Projects</h1>
          <p className="con-sub">Every app deployed under this company.</p>
        </div>
        <div className="detail-actions">
          <button type="button" className="con-btn ghost" onClick={() => setSkillOpen(true)}>How to deploy</button>
          {canWrite && (
            <button type="button" className="con-btn" onClick={() => setCreating((v) => !v)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              New project
            </button>
          )}
        </div>
      </div>

      <SkillDialog open={skillOpen} onClose={() => setSkillOpen(false)} />

      {creating && canWrite && (
        <form className="token-create" onSubmit={createProject}>
          <input
            className="con-input"
            placeholder="Project name — e.g. Invoice Portal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoFocus
          />
          <button className="con-btn" type="submit" disabled={busy || !name.trim()}>
            {busy ? "Creating…" : "Create"}
          </button>
        </form>
      )}

      {error && <div className="con-alert err">{error}</div>}

      {!projects && !error && (
        <div className="app-grid">
          {[0, 1, 2].map((i) => <div className="app-card skeleton" key={i} aria-hidden="true" />)}
        </div>
      )}

      {projects && projects.length === 0 && (
        <div className="con-empty">
          <h3>No projects yet</h3>
          <p>{canWrite ? "Create a project above, then deploy to its subdomain." : "Ask a project admin to create the first project."}</p>
        </div>
      )}

      {projects && projects.length > 0 && (
        <div className="app-grid">
          {projects.map((p) => (
            <Link key={p.id} href={`/app/projects/${p.id}`} className="app-card">
              <div className="app-card-top">
                <span className="app-name">{p.name}</span>
              </div>
              <div className="app-url">{p.slug}.app.hostnsoft.com</div>
              <div className="app-meta">
                <span className="mono">{p.memoryMb} MB</span>
                <span className="dot-sep" />
                <span>Created {formatDate(p.createdAt)}</span>
              </div>
              <div className="app-foot">
                <span className="mono-faint">Added {relativeTime(p.createdAt)}</span>
                <svg className="app-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
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
    <div className="con-page">
      <div className="con-head">
        <div>
          <h1 className="con-h1">Welcome to hostnsoft</h1>
          <p className="con-sub">Create a company to hold your projects and team.</p>
        </div>
      </div>
      {error && <div className="con-alert err">{error}</div>}
      <form className="token-create" onSubmit={create}>
        <input className="con-input" placeholder="Company name — e.g. Acme Robotics" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
        <button className="con-btn" type="submit" disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create company"}</button>
      </form>
    </div>
  );
}
