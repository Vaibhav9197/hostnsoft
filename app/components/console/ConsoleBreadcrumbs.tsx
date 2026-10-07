"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, Menu } from "lucide-react";

import { showcaseApi } from "@/app/lib/hnsApi";
import { useSession } from "@/app/lib/session";
import { useProject } from "@/app/lib/useProject";

import { HeaderPlanBadge } from "./HeaderPlanBadge";
import { AccountMenu } from "./HeaderUserMenu";

type Crumb = { label: React.ReactNode; href?: string };

/* Top-level panel pages, by their first segment under /app. */
const PAGES: Record<string, string> = {
  billing: "Billing",
  members: "Members",
  settings: "Settings",
  showcase: "Showcase",
  tokens: "Deploy tokens",
  "switch-workspace": "Switch workspace",
};

/* Fixed pages under Showcase. Any other segment there is a showcase page's
   id, and the crumb names the page itself. */
const SHOWCASE_PAGES: Record<string, string> = {
  new: "New showcase page",
  /* Matches the page's own title. */
  submit: "List an app",
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
 * "☰ Acme / my-app / Deployments" above every panel page, so the way home
 * is always in the same place. The trail starts at the workspace — the
 * company everything below is scoped to — and links back to its apps; the
 * menu icon before it opens the same navigation as the header. The apps list
 * shows just the company, so the trail sits in the same spot on every page.
 * The plan chip sits at the right end of the same row.
 */
export function ConsoleBreadcrumbs() {
  const { activeCompany } = useSession();
  const pathname = usePathname() ?? "/app";
  const parts = pathname.replace(/^\/app\/?/, "").split("/").filter(Boolean);
  const projectId = parts[0] === "projects" ? parts[1] : null;

  const crumbs: Crumb[] = [{ label: activeCompany?.companyName ?? "Your apps", href: "/app" }];
  if (parts.length === 0) {
    /* The apps list itself: the company is the current page. */
  } else if (projectId) {
    crumbs.push({ label: "", href: parts[2] ? `/app/projects/${projectId}` : undefined });
    if (parts[2]) crumbs.push({ label: SECTIONS[parts[2]] ?? parts[2] });
  } else {
    const page = PAGES[parts[0]] ?? parts[0];
    if (parts.length > 1) {
      crumbs.push({ label: page, href: `/app/${parts[0]}` });
      crumbs.push({ label: subPageLabel(parts[0], parts[1]) });
    } else {
      crumbs.push({ label: page });
    }
  }

  return (
    /* Its own layer: the apps list's sky backdrop is fixed behind that page
       and would otherwise paint over this row. */
    <div className="relative z-[1] mb-5 flex items-center gap-3">
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex flex-wrap items-center gap-1 text-[0.82rem] text-muted-foreground">
          <li className="inline-flex items-center">
            <AccountMenu
              label="Open menu"
              align="start"
              triggerClassName="-ml-1.5 mr-0.5 grid size-7 place-items-center rounded-md transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:outline-none"
            >
              <Menu className="size-4" aria-hidden="true" />
            </AccountMenu>
          </li>
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
      <HeaderPlanBadge />
    </div>
  );
}

function subPageLabel(section: string, segment: string): React.ReactNode {
  if (section !== "showcase") return segment;
  return SHOWCASE_PAGES[segment] ?? <CollectionName collectionId={segment} />;
}

/* The showcase page's own name, looked up from the workspace's list of
   pages. "Page" until it arrives, and if it never does — a trail that
   errors is worse than one that's briefly generic. */
function CollectionName({ collectionId }: { collectionId: string }) {
  const { activeCompanyId } = useSession();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    setName(null);
    if (!activeCompanyId) return;
    let cancelled = false;
    showcaseApi
      .listCollections(activeCompanyId)
      .then((all) => {
        const c = all.find((x) => x.id === collectionId);
        if (!cancelled && c) setName(c.type === "public" ? "Embarko Showcase" : c.title);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeCompanyId, collectionId]);

  return <>{name ?? "Page"}</>;
}

function ProjectName({ projectId }: { projectId: string }) {
  const { activeCompanyId } = useSession();
  const { project } = useProject(activeCompanyId, projectId);
  return <>{project?.name ?? "App"}</>;
}
