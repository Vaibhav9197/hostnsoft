import { redirect } from "next/navigation";

/* The Showcase tab is gone; the pages an app is on now sit on its Overview.
   Kept as a redirect so old links still land somewhere useful. */
export default async function ProjectShowcasePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(`/app/projects/${encodeURIComponent(projectId)}`);
}
