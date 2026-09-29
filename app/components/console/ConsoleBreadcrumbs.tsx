"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { useSession } from "@/app/lib/session";
import { useProject } from "@/app/lib/useProject";

type Crumb = { label: string; href?: string };

/* Top-level panel pages, by their first segment under /app. */
const PAGES: Record<string, string> = {
  billing: "Billing",
  members: "Members",
  settings: "Settings",
  showcase: "Showcase",
  tokens: "Deploy tokens",
  "switch-workspace": "Switch workspace",
};

/* A project's sections, matching ProjectNav's labels. */
const SECTIONS: Record<string, string> = {
  environment: "App setup",
  deployments: "Deployments",
  domain: "Domain",
  showcase: "Showcase",
  settings: "Settings",
};

/**
 * "Home / my-app / Deployments" above every panel page, so the way home
 * is always in the same place. Not shown on the apps list itself: a trail that
 * only says where you already are is noise.
 */
export function ConsoleBreadcrumbs() {
  const pathname = usePathname() ?? "/app";
  const parts = pathname.replace(/^\/app\/?/, "").split("/").filter(Boolean);
  const projectId = parts[0] === "projects" ? parts[1] : null;

  if (parts.length === 0) return null;

  const crumbs: Crumb[] = [{ label: "Home", href: "/app" }];
  if (projectId) {
    crumbs.push({ label: "", href: parts[2] ? `/app/projects/${projectId}` : undefined });
    if (parts[2]) crumbs.push({ label: SECTIONS[parts[2]] ?? parts[2] });
  } else {
    const page = PAGES[parts[0]] ?? parts[0];
    if (parts.length > 1) {
      crumbs.push({ label: page, href: `/app/${parts[0]}` });
      crumbs.push({ label: parts[0] === "showcase" && parts[1] === "submit" ? "Add an app" : "Event page" });
    } else {
      crumbs.push({ label: page });
    }
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex flex-wrap items-center gap-1 text-[0.82rem] text-muted-foreground">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          const label = projectId && i === 1 ? <ProjectName projectId={projectId} /> : c.label;
          return (
            <li key={i} className="inline-flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />}
              {c.href && !last ? (
                <Link href={c.href} className="truncate transition-colors hover:text-foreground">
                  {label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className="truncate font-medium text-foreground">
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ProjectName({ projectId }: { projectId: string }) {
  const { activeCompanyId } = useSession();
  const { project } = useProject(activeCompanyId, projectId);
  return <>{project?.name ?? "App"}</>;
}
