"use client";

import { use } from "react";
import { ProjectAnalytics } from "../../../components/console/ProjectAnalytics";
import { Alert, Page, Skeleton } from "../../../components/console/kit";
import { ProjectShowcasePages } from "../../../components/console/showcase/ProjectShowcasePages";
import { useSession } from "../../../lib/session";
import { useProject } from "../../../lib/useProject";

/* The app's name, its live URL and whether it is up all live in ProjectNav
   above every section, so repeating them here only asked the reader to check
   which copy to trust. What went with them — the slug, the requested memory,
   the created date — was infrastructure detail nobody acts on: the slug is the
   first label of the URL already on screen, and memory and age say nothing
   about whether the app is serving.

   That leaves traffic as the whole page, which is the point: the header answers
   "is it live?", and this answers "is anyone using it?". */
export default function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { activeCompanyId } = useSession();
  const { project, error } = useProject(activeCompanyId, projectId);

  if (error) return <Page><Alert>{error}</Alert></Page>;
  if (!project) return <Page><Skeleton className="h-[120px]" aria-hidden="true" /></Page>;

  return (
    <Page>
      <ProjectAnalytics companyId={activeCompanyId} projectId={projectId} isStatic={project?.kind === "static"} />
      <ProjectShowcasePages companyId={activeCompanyId} projectId={projectId} />
    </Page>
  );
}
