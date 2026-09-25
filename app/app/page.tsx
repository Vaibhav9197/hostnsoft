"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Plus } from "lucide-react";
import { CloudBackdrop } from "../components/console/CloudBackdrop";
import { Alert, EmptyState, Page, PageHeader, Skeleton, Steps } from "../components/console/kit";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { DeployPromptDialog } from "../components/console/DeployPromptDialog";
import { CopyPromptButton } from "../components/CopyPromptButton";
import { CONSOLE_DEPLOY_PROMPT } from "../lib/deployPrompt";
import { HnsError } from "../lib/client"; // used by the parked createProject below
import { HealthPill } from "../components/console/HealthPill";
import { companiesApi, projectsApi } from "../lib/hnsApi";
import { formatDateTime } from "../lib/format";
import { useSession } from "../lib/session";
import type { Project } from "../lib/types";
import { appHost } from "../lib/site";

export default function ProjectsPage() {
  const { activeCompanyId, companies, reload } = useSession();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // Parked with the name field and createProject below.
  // const [name, setName] = useState("");
  // const [busy, setBusy] = useState(false);

  /* `quiet` keeps the current cards on screen while re-reading the list. The
     first load has nothing to show and wants the skeletons; a refresh after a
     deploy already has cards, and blanking them to skeletons reads as if the
     apps went away. */
  const load = useCallback(async (quiet = false) => {
    if (!activeCompanyId) {
      setProjects([]);
      return;
    }
    if (!quiet) setProjects(null);
    setError(null);
    try {
      const data = await projectsApi.list(activeCompanyId);
      setProjects(data);
    } catch (e) {
      /* A failed poll keeps the cards it already has — `error` replaces them,
         and one blip mid-build is not a reason to take the grid away from
         someone watching it. */
      if (!quiet) setError(e instanceof Error ? e.message : "Couldn’t load your apps.");
    }
  }, [activeCompanyId]);

  useEffect(() => {
    load();
  }, [load]);

  /* An upload returns as soon as the build is queued, and the app can take a
     moment to show up in the list. Without this the page looked unchanged
     after a successful deploy and the only way to see the new app was a manual
     refresh. Re-read straight away, then a couple more times — once a card
     exists, the watch below takes over and follows the build to the end. */
  const refreshAfterDeploy = useCallback(() => {
    load(true);
    for (const ms of [2000, 5000]) setTimeout(() => load(true), ms);
  }, [load]);

  /* A build runs on for minutes after the deploy request comes back. Following
     it here is what lets the card go Deploying → Starting → Running in front of
     you instead of being a thing you have to refresh to find out about.

     Every five seconds rather than every second: this is a grid of apps someone
     is glancing at, not a build log, and the states it moves through are
     minutes apart. Read off the list already on screen, so a page of settled
     apps never polls, and capped so a stuck build doesn't leave an interval
     running all day. */
  const settling = projects?.some(
    (p) => p.status === "in_progress" || p.health === "starting",
  ) ?? false;
  useEffect(() => {
    if (!settling) return;
    const tick = setInterval(() => load(true), 5000);
    const giveUp = setTimeout(() => clearInterval(tick), 10 * 60 * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(giveUp);
    };
  }, [settling, load]);

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
        title="Your apps"
        actions={
          <Button onClick={() => setCreating((v) => !v)}>
            <Plus />
            Deploy an app
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
        title="Deploy an app"
        description="Hand the prompt to your AI agent, or upload the app yourself. Either way it lands here on its own subdomain."
        onDeployed={refreshAfterDeploy}
      />

      {error && <Alert>{error}</Alert>}

      {!projects && !error && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
          {[0, 1, 2].map((i) => <Skeleton className="min-h-[150px]" key={i} aria-hidden="true" />)}
        </div>
      )}

      {projects && projects.length === 0 && (
        <EmptyState title="Your apps will appear here">
          {/* The prompt itself, not a button that hides it: there is nothing to
              decide here, so showing it is one step shorter than a dialog. */}
          <div className="relative mx-auto mt-4 max-w-xl text-left">
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-card p-4 pr-12 font-mono text-xs leading-relaxed text-muted-foreground">
              {CONSOLE_DEPLOY_PROMPT}
            </pre>
            <CopyPromptButton
              text={CONSOLE_DEPLOY_PROMPT}
              aria-label="Copy deploy prompt"
              title="Copy deploy prompt"
              className="absolute right-2 top-2 grid size-8 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
              copiedChildren={<Check className="size-4 text-foreground" />}
            >
              <Copy className="size-4" />
            </CopyPromptButton>
          </div>
          <Steps steps={["Copy prompt", "Paste into your AI agent", "Ask it to deploy"]} />
        </EmptyState>
      )}

      {projects && projects.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/app/projects/${p.id}`}
              /* No outline: the card's own surface and its shadow already lift
                 it off the sky, and a third edge on top of those made a grid of
                 apps read as a table. Hover keeps the lift and the deeper
                 shadow, so the affordance survives losing the border. */
              className="group relative flex flex-col gap-3.5 overflow-hidden rounded-lg bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              {/* A bar sweeping across the top of the card while a build runs.
                  The pill's pulsing dot is the precise signal, but it is 8px in
                  a corner — this is the one somebody notices from across the
                  grid without looking for it, which is the whole point of
                  showing progress at all. Absolute and clipped by the card, so
                  it costs the layout nothing and vanishes when the deploy
                  lands. */}
              {p.status === "in_progress" && (
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-muted"
                  aria-hidden="true"
                >
                  <span className="block h-full w-1/4 animate-sweep bg-primary" />
                </span>
              )}
              {/* The initial leads, the way an app icon does everywhere else,
                  which frees the top-right for the one thing you open this
                  page to find out. Health holds a fixed position across every
                  card, so a grid of apps can be scanned down one column
                  instead of read card by card. */}
              <div className="flex items-start gap-3">
                <div className="size-10 shrink-0 grid place-items-center rounded-md bg-muted text-primary font-semibold text-sm">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <h3 className="text-base font-bold text-foreground truncate">{p.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{appHost(p.slug)}</p>
                </div>
                <HealthPill
                  health={p.health}
                  deploying={p.status === "in_progress"}
                  className="mt-1"
                />
              </div>

              {/* `updatedAt` is when the project record last changed, which is
                  not the same as when the app last deployed — a rollback moves
                  the running version without touching this. Labelled "Last
                  updated" rather than "Last deployed" for exactly that reason. */}
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs text-faint">Last updated {formatDateTime(p.updatedAt)}</span>
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
