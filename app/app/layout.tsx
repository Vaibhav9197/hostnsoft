"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, ExternalLink, LogOut } from "lucide-react";
import { LoginScreen } from "../components/console/LoginScreen";
import { Alert } from "../components/console/kit";
import { atLeast, SessionProvider, useSession } from "../lib/session";
import { ROLE_LABEL } from "../lib/format";
import { cn } from "../lib/utils";
import { useProject } from "../lib/useProject";

const ICONS = {
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  members: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  token: "M15 7a4 4 0 1 0-3.9 5H13l2 2 2-2 2 2 2-2-3-3a4 4 0 0 0-1-2Z",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 12h1M19 12h1M12 4v1M12 19v1M6 6l1 1M17 17l1 1M18 6l-1 1M7 17l-1 1",
  deploy: "M12 15V4m0 0-4 4m4-4 4 4M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3",
  env: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
};

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Shell>{children}</Shell>
    </SessionProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { status, apiConnected } = useSession();
  const pathname = usePathname();
  const projectMatch = pathname.match(/^\/app\/projects\/([^/]+)/);
  const projectId = projectMatch?.[1] ?? null;

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3.5 bg-background" role="status" aria-live="polite">
        <span className="size-6 animate-spin rounded-full border-2 border-input border-t-primary" aria-hidden="true" />
        <span className="font-mono text-[0.78rem] text-faint">Loading your workspace…</span>
      </div>
    );
  }

  if (status === "anon") return <LoginScreen />;

  return (
    <div className="grid min-h-screen grid-cols-[250px_1fr] bg-background">
      {projectId ? (
        <ProjectSidebar projectId={projectId} pathname={pathname} />
      ) : (
        <WorkspaceSidebar pathname={pathname} />
      )}
      <div className="flex min-w-0 flex-col">
        <main className="mx-auto w-full max-w-5xl px-8 py-8">
          {!apiConnected && (
            <Alert variant="warn" className="mb-6">
              You’re signed in, but the hostnsoft-api service is unreachable right now — company and
              project data can’t be loaded until it’s back.
            </Alert>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarUser() {
  const { user, signOut } = useSession();
  const label = user?.name || user?.email || "";
  return (
    <div style={{ backgroundColor: "var(--accent-soft)", borderColor: "var(--accent-line)" }} className="flex items-center gap-3 rounded-lg border px-2 py-2.5 transition-colors hover:border-opacity-100">
      <span style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }} className="grid size-9 shrink-0 place-items-center rounded-md text-sm font-bold" aria-hidden="true">
        {label.charAt(0).toUpperCase() || "?"}
      </span>
      <div className="min-w-0 flex-1 text-left leading-snug">
        <div style={{ color: "var(--ink)" }} className="truncate text-[0.85rem] font-semibold">{user?.name || "—"}</div>
        <div style={{ color: "var(--ink-soft)" }} className="truncate text-[0.75rem]">{user?.email}</div>
      </div>
      <button
        type="button"
        onClick={() => signOut()}
        aria-label="Log out"
        title="Log out"
        style={{ color: "var(--ink-soft)" }}
        className="grid size-8 shrink-0 place-items-center rounded-md border transition-all hover:bg-elevated"
      >
        <LogOut className="size-[16px]" />
      </button>
    </div>
  );
}

// The sidebar company control is a single "Switch Company" option — it shows the
// active company and links to the dedicated /app/switch-company page, where
// switching and company management (new / rename / delete) live.
function CompanySwitcher() {
  const { activeCompany } = useSession();
  const pathname = usePathname();
  const active = activeCompany;
  const onSwitchPage = pathname === "/app/switch-company";

  return (
    <Link
      href="/app/switch-company"
      aria-label="Switch company"
      title="Switch company"
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-border bg-elevated/40 p-2.5 transition-colors hover:border-input hover:bg-elevated",
        onSwitchPage && "border-primary/40 bg-primary/5",
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-sm font-extrabold text-primary-foreground" aria-hidden="true">
        {(active?.companyName ?? "?").charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.9rem] font-bold text-foreground">{active?.companyName ?? "—"}</div>
        <div className="mt-0.5 font-mono text-[0.64rem] uppercase tracking-[0.12em] text-primary">
          {active ? ROLE_LABEL[active.role] : "Switch company"}
        </div>
      </div>
      <ChevronsUpDown className="size-4 shrink-0 text-faint" />
    </Link>
  );
}

function NavLink({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      style={{
        color: active ? "var(--ink)" : "var(--ink)",
        backgroundColor: active ? "var(--accent-soft)" : "transparent",
        borderColor: active ? "var(--accent-line)" : "transparent",
      }}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-3 text-[0.93rem] font-semibold transition-all duration-150 border",
        active && "shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        "hover:bg-elevated/60",
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: active ? "var(--accent)" : "var(--ink)" }} className="size-[18px] shrink-0"><path d={icon} /></svg>
      {label}
    </Link>
  );
}

function WorkspaceSidebar({ pathname }: { pathname: string }) {
  const { role } = useSession();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="sticky top-0 flex h-screen flex-col gap-1.5 border-r border-border bg-card p-5">
      <CompanySwitcher />
      <nav className="mt-3.5 flex flex-col gap-0.5" aria-label="Console">
        <NavLink href="/app" label="Projects" icon={ICONS.grid} active={isActive("/app", true)} />
        <NavLink href="/app/members" label="Members" icon={ICONS.members} active={isActive("/app/members")} />
        {atLeast(role, "company_admin") && (
          <NavLink href="/app/tokens" label="Deploy tokens" icon={ICONS.token} active={isActive("/app/tokens")} />
        )}
        <NavLink href="/app/settings" label="Settings" icon={ICONS.gear} active={isActive("/app/settings")} />
      </nav>
      <div className="mt-auto border-t border-border pt-3">
        <SidebarUser />
      </div>
    </aside>
  );
}

function ProjectSidebar({ projectId, pathname }: { projectId: string; pathname: string }) {
  const { activeCompanyId } = useSession();
  const { project } = useProject(activeCompanyId, projectId);
  const base = `/app/projects/${projectId}`;

  const nav = [
    { seg: "", label: "Overview", icon: ICONS.grid },
    { seg: "deployments", label: "Deployments", icon: ICONS.deploy },
    { seg: "environment", label: "Environment", icon: ICONS.env },
    { seg: "settings", label: "Settings", icon: ICONS.gear },
  ];
  const isActive = (seg: string) => (seg ? pathname.startsWith(`${base}/${seg}`) : pathname === base);
  const liveUrl = project ? `https://${project.slug}.app.hostnsoft.com` : null;

  return (
    <aside className="sticky top-0 flex h-screen flex-col gap-1.5 border-r border-border bg-card p-5">
      <Link href="/app" className="mb-1 flex w-fit items-center gap-1.5 text-[0.85rem] text-faint hover:text-foreground">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[15px]"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
        All projects
      </Link>

      <div className="mb-0.5 flex items-center gap-2.5 rounded-lg border border-border bg-elevated/40 p-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-sm font-extrabold text-primary-foreground" aria-hidden="true">
          {(project?.name ?? projectId).charAt(0).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-col items-start gap-1">
          <div className="truncate text-[0.9rem] font-bold text-foreground">{project?.name ?? "…"}</div>
          <div className="truncate font-mono text-[0.64rem] uppercase tracking-[0.12em] text-primary">{project?.slug ?? "loading…"}</div>
        </div>
      </div>

      <nav className="mt-3.5 flex flex-col gap-0.5" aria-label="Project">
        {nav.map((item) => (
          <NavLink
            key={item.label}
            href={item.seg ? `${base}/${item.seg}` : base}
            label={item.label}
            icon={item.icon}
            active={isActive(item.seg)}
          />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
        {liveUrl && (
          <a
            className="flex items-center gap-2 px-3 py-2 text-[0.85rem] text-faint hover:text-foreground"
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="size-4" />
            Open live URL
          </a>
        )}
        <SidebarUser />
      </div>
    </aside>
  );
}
