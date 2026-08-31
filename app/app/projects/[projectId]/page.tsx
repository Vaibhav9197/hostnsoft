"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { StatusPill } from "../../../components/console/StatusPill";
import { deploymentsApi } from "../../../lib/hnsApi";
import { formatDate, relativeTime } from "../../../lib/format";
import { useSession } from "../../../lib/session";
import { useProject } from "../../../lib/useProject";
import type { Deployment } from "../../../lib/types";

export default function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { activeCompanyId } = useSession();
  const { project, error } = useProject(activeCompanyId, projectId);
  const [latest, setLatest] = useState<Deployment | null | undefined>(undefined);

  const loadLatest = useCallback(async () => {
    if (!activeCompanyId) return;
    try {
      const deps = await deploymentsApi.list(activeCompanyId, projectId);
      setLatest(deps[0] ?? null);
    } catch {
      setLatest(null);
    }
  }, [activeCompanyId, projectId]);

  useEffect(() => {
    loadLatest();
  }, [loadLatest]);

  if (error) return <div className="con-page"><div className="con-alert err">{error}</div></div>;
  if (!project) return <div className="con-page"><div className="skeleton" style={{ height: 120 }} aria-hidden="true" /></div>;

  const liveUrl = `https://${project.slug}.app.hostnsoft.com`;

  return (
    <div className="con-page">
      <div className="con-head">
        <div>
          <h1 className="con-h1">Overview</h1>
          <p className="con-sub">Details for {project.name}.</p>
        </div>
        <div className="detail-actions">
          <a className="con-btn" href={liveUrl} target="_blank" rel="noreferrer">
            Open live URL
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M9 7h8v8" /></svg>
          </a>
        </div>
      </div>

      <div className="detail-facts">
        <Fact k="Live URL" v={<a href={liveUrl} target="_blank" rel="noreferrer">{project.slug}.app.hostnsoft.com</a>} />
        <Fact k="Slug" v={project.slug} mono />
        <Fact k="Memory (requested)" v={`${project.memoryMb} MB`} mono />
        <Fact k="Health" v={<StatusPill status={project.health} />} />
        <Fact k="Created" v={formatDate(project.createdAt)} />
      </div>

      <section className="panel pad">
        <div className="latest-dep">
          <div>
            <div className="fact-k">Latest deployment</div>
            {latest === undefined ? (
              <div className="skeleton" style={{ height: 40, width: 240, marginTop: 8 }} aria-hidden="true" />
            ) : latest ? (
              <>
                <div className="latest-ver">
                  <span className="mono">{latest.version}</span>
                  <StatusPill status={latest.status} />
                </div>
                <div className="mono-faint">
                  {latest.appVersion} · {relativeTime(latest.createdAt)}
                  {latest.triggeredBy ? ` · ${latest.triggeredBy}` : ""}
                </div>
              </>
            ) : (
              <p className="con-sub" style={{ marginTop: 6 }}>No deployments yet.</p>
            )}
          </div>
          <div className="latest-links">
            <Link className="con-btn ghost sm" href={`/app/projects/${projectId}/deployments`}>Deploy history</Link>
          </div>
        </div>
        {latest?.errorDetail && <div className="con-alert err in-panel" style={{ marginTop: 14 }}>{latest.errorDetail}</div>}
      </section>

      <p className="con-sub">Health is reported by the platform and currently shows <b>unknown</b> until live status is wired up.</p>
    </div>
  );
}

function Fact({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="fact">
      <div className="fact-k">{k}</div>
      <div className={`fact-v${mono ? " mono" : ""}`}>{v}</div>
    </div>
  );
}
