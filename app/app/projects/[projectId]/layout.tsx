import { ProjectNav } from "../../../components/console/ProjectNav";

/**
 * Wraps every project page with the project's identity and section tabs, so the
 * navigation sits inside the project rather than in the app-wide sidebar.
 */
export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <>
      <ProjectNav projectId={projectId} />
      {children}
    </>
  );
}
