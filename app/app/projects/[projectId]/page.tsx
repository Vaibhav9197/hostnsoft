"use client";

import { use } from "react";
import { ProjectAnalytics } from "../../../components/console/ProjectAnalytics";
import { HealthPill } from "../../../components/console/HealthPill";
import { Alert, Fact, FactGrid, Page, PageHeader, Skeleton } from "../../../components/console/kit";
import { formatDate } from "../../../lib/format";
import { useSession } from "../../../lib/session";
import { useProject } from "../../../lib/useProject";

export default function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { activeCompanyId } = useSession();
  const { project, error } = useProject(activeCompanyId, projectId);

  if (error) return <Page><Alert>{error}</Alert></Page>;
  if (!project) return <Page><Skeleton className="h-[120px]" aria-hidden="true" /></Page>;

  const liveUrl = `https://${project.slug}.app.embarko.ai`;

  return (
    <Page>
      <PageHeader title="Overview" subtitle={`Details for ${project.name}.`} />

      <FactGrid>
        <Fact k="Live URL" v={<a className="text-primary hover:underline" href={liveUrl} target="_blank" rel="noreferrer">{project.slug}.app.embarko.ai</a>} />
        <Fact k="Slug" v={project.slug} mono />
        <Fact k="Memory (requested)" v={`${project.memoryMb} MB`} mono />
        <Fact k="Health" v={<HealthPill health={project.health} variant="pill" />} />
        <Fact k="Created" v={formatDate(project.createdAt)} />
      </FactGrid>

      <ProjectAnalytics companyId={activeCompanyId} projectId={projectId} />
    </Page>
  );
}
