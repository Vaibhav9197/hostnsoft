"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { deploymentsApi, projectsApi } from "@/app/lib/hnsApi";
import type { Deployment, Project } from "@/app/lib/types";

/**
 * Follows the deploy a copied prompt is about to cause, so the deploy dialog
 * can say Waiting → Deploying → Starting → Live (or what went wrong) instead
 * of going quiet.
 *
 * Which app it is: the platform knows an app only by its name, and the AI
 * picks the name — a "new app" prompt can land on an app that already
 * exists, and an update prompt can land on a new one. So this doesn't guess
 * from which dialog it was opened in. At copy time it notes the newest deploy
 * of every app in the workspace; the first app whose newest deploy changes
 * (or a brand-new app) is the one it follows. `preferProjectId` only breaks a
 * tie in favour of the app being updated.
 *
 * It reads deploy history, not `project.status`: that one follows the live
 * version and only moves on success, so a build in progress never shows
 * there. The newest history row is `in_progress` from the moment
 * hostnsoft-deploy accepts the upload.
 *
 * A successful deploy isn't the end for a server app: hostnsoft-deploy
 * records success once the job is submitted, and the app can still fail to
 * come up. So success waits for `health` to say running (or crashed).
 * Static sites have no process, so success is live.
 */

type Target = Pick<Project, "id" | "slug">;

export type DeployProblem =
  /** The build or deploy itself failed. */
  | "build"
  /** Built and started, then stopped. */
  | "crashed"
  /** Built, but never came up within STARTING_GRACE_MS. */
  | "not_started";

export type DeployWatch =
  | { phase: "idle" }
  | { phase: "waiting"; slow: boolean }
  | { phase: "deploying"; project: Target }
  | { phase: "starting"; project: Target }
  | { phase: "live"; project: Target }
  | { phase: "failed"; project: Target; problem: DeployProblem; errorDetail: string | null };

/* A glance-at-it pace, like the apps grid: a build takes minutes. */
const TICK_MS = 4000;
/* When the wording turns to "still nothing — here's why that can happen". */
const SLOW_MS = 10 * 60 * 1000;
/* When polling stops for good, so a prompt nobody pasted doesn't poll all day. */
const GIVE_UP_MS = 30 * 60 * 1000;
/* How long a built server app gets to report running before we say so. */
const STARTING_GRACE_MS = 3 * 60 * 1000;

/** Newest deploy id per app at copy time. `null`: the app had none. */
type Baseline = Map<string, string | null>;

const newestOf = (list: Deployment[]) => list[0] ?? null;

export function useDeployWatch({
  companyId,
  preferProjectId,
  onEvent,
}: {
  companyId: string | null | undefined;
  /** The app an update prompt names: wins if two apps change at once. */
  preferProjectId?: string | null;
  /** Fires when the deploy is first seen, and when it ends — so the page
   *  around the steps can re-read its own list. */
  onEvent?: (event: "seen" | "live" | "failed") => void;
}) {
  const [watch, setWatch] = useState<DeployWatch>({ phase: "idle" });
  const baseline = useRef<Baseline | null>(null);
  /* Every app that existed at copy time, including any whose history
     couldn't be read then. */
  const knownIds = useRef<Set<string>>(new Set());
  /* Bumped on start and stop, so a reply from an earlier watch is dropped. */
  const run = useRef(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  /* The current phase, readable inside the callbacks without re-creating them. */
  const watchPhase = useRef<DeployWatch["phase"]>("idle");
  watchPhase.current = watch.phase;

  const stop = useCallback(() => {
    run.current++;
    baseline.current = null;
    setWatch({ phase: "idle" });
  }, []);

  /* Called on copy. A second copy while a watch is running keeps it: the
     snapshot from the first copy is still the right "before". A copy after
     one ended starts over, for whoever is trying again. */
  const start = useCallback(async () => {
    if (!companyId) return;
    const p = watchPhase.current;
    if (baseline.current && (p === "waiting" || p === "deploying" || p === "starting")) return;
    const mine = ++run.current;
    baseline.current = null;
    setWatch({ phase: "waiting", slow: false });
    try {
      const projects = await projectsApi.list(companyId);
      const newest = await Promise.all(
        projects.map((p) =>
          deploymentsApi
            .list(companyId, p.id)
            .then((d) => newestOf(d)?.id ?? null)
            /* Unreadable now: left out, and noted on the first tick instead,
               so it can't be mistaken for an app that is new. */
            .catch(() => undefined),
        ),
      );
      const next: Baseline = new Map();
      projects.forEach((p, i) => {
        if (newest[i] !== undefined) next.set(p.id, newest[i]!);
      });
      if (run.current === mine) {
        baseline.current = next;
        knownIds.current = new Set(projects.map((p) => p.id));
      }
    } catch {
      /* No snapshot, no way to tell new from old. Say nothing alarming —
         the step falls back to the plain "it shows up here" wording. */
      if (run.current === mine) setWatch({ phase: "idle" });
    }
  }, [companyId]);

  const polling = watch.phase === "waiting" || watch.phase === "deploying" || watch.phase === "starting";

  useEffect(() => {
    if (!polling || !companyId) return;
    const mine = run.current;
    const startedAt = Date.now();
    let target: Target | null = null;
    let succeededAt = 0;

    const set = (next: DeployWatch) => {
      if (run.current === mine) setWatch(next);
    };

    /* The first app whose newest deploy isn't the one noted at copy time. */
    async function findTarget(base: Baseline, projects: Project[]) {
      const histories = await Promise.all(
        projects.map((p) => deploymentsApi.list(companyId!, p.id).then(newestOf).catch(() => undefined)),
      );
      const changed: { project: Project; deploy: Deployment }[] = [];
      projects.forEach((p, i) => {
        const deploy = histories[i];
        if (deploy === undefined) return;
        if (knownIds.current.has(p.id) && !base.has(p.id)) {
          /* Missed at copy time: note it now rather than count it. */
          base.set(p.id, deploy?.id ?? null);
          return;
        }
        const before = base.get(p.id) ?? null;
        if (deploy && deploy.id !== before) changed.push({ project: p, deploy });
      });
      if (!changed.length) return null;
      changed.sort(
        (a, b) =>
          Number(b.project.id === preferProjectId) - Number(a.project.id === preferProjectId) ||
          b.deploy.createdAt.localeCompare(a.deploy.createdAt),
      );
      return changed[0];
    }

    async function tick() {
      const base = baseline.current;
      if (!base || run.current !== mine || !companyId) return;
      try {
        const projects = await projectsApi.list(companyId);
        let project: Project | undefined;
        let deploy: Deployment | null;
        if (!target) {
          const found = await findTarget(base, projects);
          if (!found) {
            set({ phase: "waiting", slow: Date.now() - startedAt > SLOW_MS });
            return;
          }
          project = found.project;
          deploy = found.deploy;
          target = { id: project.id, slug: project.slug };
          onEventRef.current?.("seen");
        } else {
          project = projects.find((p) => p.id === target!.id);
          deploy = newestOf(await deploymentsApi.list(companyId, target.id));
        }
        if (run.current !== mine || !project || !deploy) return;
        const t = target!;

        if (deploy.status === "in_progress") {
          succeededAt = 0;
          return set({ phase: "deploying", project: t });
        }
        if (deploy.status === "failed") {
          onEventRef.current?.("failed");
          return set({ phase: "failed", project: t, problem: "build", errorDetail: deploy.errorDetail });
        }

        /* Succeeded. A static site is live now; a server app once it runs. */
        succeededAt ||= Date.now();
        const health = project.health;
        if (project.kind === "static" || health === "running" || health === "unknown") {
          /* "unknown" means the health check itself couldn't be reached —
             not a fact about the app, so it doesn't hold up Live. */
          onEventRef.current?.("live");
          return set({ phase: "live", project: t });
        }
        if (health === "crashed") {
          onEventRef.current?.("failed");
          return set({ phase: "failed", project: t, problem: "crashed", errorDetail: null });
        }
        if (Date.now() - succeededAt > STARTING_GRACE_MS) {
          onEventRef.current?.("failed");
          return set({ phase: "failed", project: t, problem: "not_started", errorDetail: null });
        }
        set({ phase: "starting", project: t });
      } catch {
        /* One failed read mid-build isn't news; the next tick tries again. */
      }
    }

    const id = window.setInterval(tick, TICK_MS);
    const giveUp = window.setTimeout(() => window.clearInterval(id), GIVE_UP_MS);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(giveUp);
    };
  }, [polling, companyId, preferProjectId]);

  return { watch, start, stop };
}
