"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Copy, ExternalLink } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { DeployPromptDialog } from "@/app/components/console/DeployPromptDialog";
import { useSession } from "@/app/lib/session";
import { useProject } from "@/app/lib/useProject";

/**
 * Project identity + section tabs, shown above every page inside a project.
 *
 * This navigation used to live in the left sidebar, which meant it vanished
 * whenever the sidebar was collapsed or off-canvas. Rendering it inside the
 * project section keeps it with the thing it belongs to, and keeps working once
 * the sidebar is retired.
 */
const SECTIONS = [
  { seg: "", label: "Overview" },
  /* "App setup", not "Environment": the reader is setting up their app, and
     doesn't need to know the platform calls these environment variables. The
     route keeps its name — only the label speaks user language. */
  { seg: "environment", label: "App setup" },
  { seg: "deployments", label: "Deployments" },
  { seg: "domain", label: "Domain" },
  { seg: "settings", label: "Settings" },
];

export function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const { activeCompanyId } = useSession();
  const { project } = useProject(activeCompanyId, projectId);
  const [promptOpen, setPromptOpen] = useState(false);

  const base = `/app/projects/${projectId}`;
  const isActive = (seg: string) => (seg ? pathname.startsWith(`${base}/${seg}`) : pathname === base);

  return (
    <div className="mb-6 flex flex-col gap-4">
      <Link
        href="/app"
        className="inline-flex w-fit items-center gap-1.5 text-[0.8rem] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All apps
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-foreground text-sm font-extrabold text-background">
            {(project?.name ?? projectId).charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[1.05rem] font-bold leading-tight text-foreground">
              {project?.name ?? "…"}
            </div>
            <div className="truncate font-mono text-[0.75rem] text-muted-foreground">
              {project?.slug ?? "loading…"}
            </div>
          </div>
        </div>

        {/* Sits with the app's identity rather than on one page's header, so
            it's reachable from every section. Held back until the slug is
            loaded — the live URL is built from it, and a link to
            "https://undefined.app.embarko.ai" is worse than no link. */}
        {project && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setPromptOpen(true)}>
              <Copy />
              Copy deploy prompt
            </Button>
            <Button asChild>
              <a href={`https://${project.slug}.app.embarko.ai`} target="_blank" rel="noreferrer">
                Open live URL
                <ExternalLink />
              </a>
            </Button>
          </div>
        )}
      </div>

      <DeployPromptDialog
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
        title="Deploy prompt"
        description={`Copy this and paste it into your AI agent to deploy${project ? ` ${project.name}` : ""}.`}
        /* Names this app in the prompt, so the agent redeploys it instead of
           standing up a second one under a different name. */
        appSlug={project?.slug}
      />

      {/* Underline tabs rather than a pill row: they read as sections of this
          project, not as separate destinations. */}
      <nav aria-label="App sections" className="-mb-px flex gap-1 overflow-x-auto border-b border-border">
        {SECTIONS.map((section) => {
          const active = isActive(section.seg);
          return (
            <Link
              key={section.label}
              href={section.seg ? `${base}/${section.seg}` : base}
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-[0.85rem] font-medium transition-colors ${
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:border-input hover:text-foreground"
              }`}
            >
              {section.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
