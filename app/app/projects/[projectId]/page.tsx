"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { StatusPill } from "../../../components/console/StatusPill";
import { Alert, Fact, FactGrid, Page, PageHeader, Panel, Skeleton } from "../../../components/console/kit";
import { Button } from "../../../components/ui/button";
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

  if (error) return <Page><Alert>{error}</Alert></Page>;
  if (!project) return <Page><Skeleton className="h-[120px]" aria-hidden="true" /></Page>;

  const liveUrl = `https://${project.slug}.app.embarko.ai`;

  return (
    <Page>
      <PageHeader
        title="Overview"
        subtitle={`Details for ${project.name}.`}
        actions={
          <Button asChild>
            <a href={liveUrl} target="_blank" rel="noreferrer">
              Open live URL
              <ExternalLink />
            </a>
          </Button>
        }
      />

      <FactGrid>
        <Fact k="Live URL" v={<a className="text-primary hover:underline" href={liveUrl} target="_blank" rel="noreferrer">{project.slug}.app.embarko.ai</a>} />
        <Fact k="Slug" v={project.slug} mono />
        <Fact k="Memory (requested)" v={`${project.memoryMb} MB`} mono />
        <Fact k="Health" v={<StatusPill status={project.health} />} />
        <Fact k="Created" v={formatDate(project.createdAt)} />
      </FactGrid>

      <Panel padded>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[0.66rem] uppercase tracking-[0.1em] text-faint">Latest deployment</div>
            {latest === undefined ? (
              <Skeleton className="mt-2 h-10 w-60" aria-hidden="true" />
            ) : latest ? (
              <>
                <div className="mt-1.5 mb-1 flex items-center gap-2.5 text-[1.05rem]">
                  <span className="font-mono">{latest.version}</span>
                  <StatusPill status={latest.status} />
                </div>
                <div className="font-mono text-[0.78rem] text-faint">
                  {latest.appVersion} · {relativeTime(latest.createdAt)}
                  {latest.triggeredBy ? ` · ${latest.triggeredBy}` : ""}
                </div>
              </>
            ) : (
              <p className="mt-1.5 text-[0.92rem] text-muted-foreground">No deployments yet.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/app/projects/${projectId}/deployments`}>Deploy history</Link>
            </Button>
          </div>
        </div>
        {latest?.errorDetail && <Alert className="mt-3.5">{latest.errorDetail}</Alert>}
      </Panel>

      <p className="text-[0.92rem] text-muted-foreground">Health is reported by the platform and currently shows <b className="text-foreground">unknown</b> until live status is wired up.</p>
    </Page>
  );
}
