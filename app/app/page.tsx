"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudBackdrop } from "../components/console/CloudBackdrop";
import { Alert, Page, PageHeader, Skeleton } from "../components/console/kit";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { DeployPromptDialog } from "../components/console/DeployPromptDialog";
import { FirstAppEmpty } from "../components/console/FirstAppEmpty";
import { HnsError } from "../lib/client"; // used by the parked createProject below
import { AppTile, CreateAppTile } from "../components/console/AppTile";
import { earlyProjects, markMainDataSettled } from "../lib/earlyReads";
import { readLastSeen, writeLastSeen } from "../lib/lastSeen";
import { companiesApi, projectsApi } from "../lib/hnsApi";
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

  /* `quiet` keeps the current cards on screen while re-reading the list. The
     first load has nothing to show and wants the skeletons; a refresh after a
     deploy already has cards, and blanking them to skeletons reads as if the
     apps went away. */
  const load = useCallback(async (quiet = false) => {
    if (!activeCompanyId) {
      setProjects([]);
      return;
    }
    const lastSeenKey = `projects:${activeCompanyId}`;
    /* The first load opens on the list from last visit, if there is one, and
       swaps in the real answer when it lands — skeletons only for a first ever
       visit. See lastSeen.ts. */
    if (!quiet) setProjects(readLastSeen<Project[]>(lastSeenKey));
    setError(null);
    try {
      /* Only the first read takes the one Session already started. A quiet
         re-read is asking what changed just now, so it always goes out fresh. */
      const data = await ((!quiet && earlyProjects(activeCompanyId)) || projectsApi.list(activeCompanyId));
      setProjects(data);
      writeLastSeen(lastSeenKey, data);
    } catch (e) {
      /* A failed poll keeps the cards it already has — `error` replaces them,
         and one blip mid-build is not a reason to take the grid away from
         someone watching it. A failed first load does take last visit's cards
         away: saying the apps are Live under an error that says we couldn't
         find out would be two states at once. */
      if (!quiet) {
        setProjects(null);
        setError(e instanceof Error ? e.message : "Couldn’t load your apps.");
      }
    } finally {
      // Lets the header's billing read go now that this one is out of the way.
      markMainDataSettled();
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

      {/* No header while there are no apps: the empty state below says what
          goes here and carries the one action, so a title above it only
          repeats it. It also stays hidden while the list is loading, so it
          doesn't flash in before an empty result. */}
      {projects && projects.length > 0 && (
        <PageHeader title="Your apps" />
      )}

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
        title="Host new app"
        description="Your AI built the app. Let it put the app online too."
        onDeployed={refreshAfterDeploy}
      />

      {error && <Alert>{error}</Alert>}

      {!projects && !error && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
          {[0, 1, 2].map((i) => <Skeleton className="min-h-[150px]" key={i} aria-hidden="true" />)}
        </div>
      )}

      {projects && projects.length === 0 && <FirstAppEmpty onLive={() => load(true)} />}

      {projects && projects.length > 0 && (
        <div className="sc">
          {/* The Showcase grid drops to two columns below 1100px, which made
              each card half the screen on small laptops. Here the column count
              follows the room instead: three across on a normal screen, as
              before, and four on short low-resolution screens (1366×768 and
              the like), where three left room for barely one row. */}
          <div className="sc-gal !grid-cols-[repeat(auto-fill,minmax(240px,1fr))] !pb-0 [@media(max-height:820px)]:!grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            {projects.map((p) => (
              <AppTile key={p.id} project={p} />
            ))}
            <CreateAppTile onClick={() => setCreating(true)} />
          </div>
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
      setError(e instanceof Error ? e.message : "Couldn’t create the workspace.");
      setBusy(false);
    }
  }

  return (
    <Page>
      <PageHeader title="Welcome to Embarko" subtitle="Create a workspace to hold your apps and team." />
      {error && <Alert>{error}</Alert>}
      <form className="flex flex-wrap gap-2.5" onSubmit={create}>
        <Input
          className="min-w-[220px] flex-1"
          placeholder="Workspace name — e.g. Acme Robotics"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoFocus
        />
        <Button type="submit" disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create workspace"}</Button>
      </form>
    </Page>
  );
}
