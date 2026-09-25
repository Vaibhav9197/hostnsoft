"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Copy, ExternalLink } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip";
import { Button } from "@/app/components/ui/button";
import { DeployPromptDialog } from "@/app/components/console/DeployPromptDialog";
import { HealthPill } from "@/app/components/console/HealthPill";
import { useSession } from "@/app/lib/session";
import { useProject } from "@/app/lib/useProject";
import { appHost, appUrl } from "@/app/lib/site";

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
  /* Its own tab: showing the app off is something people come to do, and it
     was invisible as a panel inside Settings. */
  { seg: "showcase", label: "Showcase" },
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
            {/* Name and state on one line: "is it up?" is the question this
                page opens with, so the answer belongs beside the app it is
                about rather than further down among the details. The pill
                keeps the name truncating on its own — it never shrinks. */}
            <div className="flex min-w-0 items-center gap-2">
              <div className="truncate text-[1.05rem] font-bold leading-tight text-foreground">
                {project?.name ?? "…"}
              </div>
              {project && <HealthPill health={project.health} variant="pill" />}
            </div>
            {/* The live URL, not the slug: the address is what the reader
                recognises their app by, and it's the one piece of identity
                that stays useful once the Overview page stops repeating it.
                Held back until the slug loads — the host is built from it. */}
            {project ? (
              <a
                href={appUrl(project.slug)}
                target="_blank"
                rel="noreferrer"
                className="block truncate font-mono text-[0.75rem] text-muted-foreground transition-colors hover:text-foreground hover:underline"
              >
                {appHost(project.slug)}
              </a>
            ) : (
              <div className="truncate font-mono text-[0.75rem] text-muted-foreground">loading…</div>
            )}
          </div>
        </div>

        {/* Sits with the app's identity rather than on one page's header, so
            it's reachable from every section. Held back until the slug is
            loaded — the live URL is built from it, and a link to
            "https://undefined.embarko.app" is worse than no link. */}
        {project && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Says who does the work: the button hands the job to the
                reader's AI agent (or an upload), it does not itself rebuild
                anything. "Redeploy this app" read like a server action. */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={() => setPromptOpen(true)}>
                    <Copy />
                    Prompt to update this app
                  </Button>
                </TooltipTrigger>
                {/* Says the two things the label can't: the prompt is for the
                    agent, and it updates this app rather than creating another. */}
                <TooltipContent className="max-w-[240px]">
                  Copy this and give it to your AI agent — it ships your new code to this
                  same app, on the same URL.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button asChild>
              <a href={appUrl(project.slug)} target="_blank" rel="noreferrer">
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
        title="Prompt to update this app"
        description={`Ship a new version of${project ? ` ${project.name}` : " this app"} — copy the prompt for your AI agent, or upload it yourself.`}
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
