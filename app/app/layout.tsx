"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LoginScreen } from "../components/console/LoginScreen";
import { atLeast, SessionProvider, useSession } from "../lib/session";
import { ROLE_LABEL } from "../lib/format";
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
      <div className="console-loading" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <span className="mono-faint">Loading your workspace…</span>
      </div>
    );
  }

  if (status === "anon") return <LoginScreen />;

  return (
    <div className="console">
      {projectId ? (
        <ProjectSidebar projectId={projectId} pathname={pathname} />
      ) : (
        <WorkspaceSidebar pathname={pathname} />
      )}
      <div className="con-main">
        <main className="con-content">
          {!apiConnected && (
            <div className="con-alert warn api-banner">
              You’re signed in, but the hostnsoft-api service is unreachable right now — company and
              project data can’t be loaded until it’s back.
            </div>
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
    <div className="con-user-block">
      <span className="con-avatar" aria-hidden="true">{label.charAt(0).toUpperCase() || "?"}</span>
      <div className="con-user-meta">
        <div className="con-user-name">{user?.name || "—"}</div>
        <div className="con-user-mail">{user?.email}</div>
      </div>
      <button type="button" className="con-logout" onClick={() => signOut()} aria-label="Log out" title="Log out">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
      </button>
    </div>
  );
}

function CompanySwitcher() {
  const { companies, activeCompanyId, setActiveCompanyId } = useSession();
  const active = companies.find((c) => c.companyId === activeCompanyId);

  return (
    <div className="con-ws">
      <span className="con-ws-mark" aria-hidden="true">{(active?.companyName ?? "?").charAt(0).toUpperCase()}</span>
      <div className="con-ws-meta con-ws-switch">
        {companies.length > 1 ? (
          <select
            className="con-ws-select"
            value={activeCompanyId ?? ""}
            onChange={(e) => setActiveCompanyId(e.target.value)}
            aria-label="Switch company"
          >
            {companies.map((c) => (
              <option key={c.companyId} value={c.companyId}>{c.companyName}</option>
            ))}
          </select>
        ) : (
          <div className="con-ws-name">{active?.companyName ?? "—"}</div>
        )}
        <div className="con-ws-plan">{active ? ROLE_LABEL[active.role] : ""}</div>
      </div>
    </div>
  );
}

function NavLink({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link href={href} className={`con-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg>
      {label}
    </Link>
  );
}

function WorkspaceSidebar({ pathname }: { pathname: string }) {
  const { role } = useSession();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="con-side">
      <CompanySwitcher />
      <nav className="con-nav" aria-label="Console">
        <NavLink href="/app" label="Projects" icon={ICONS.grid} active={isActive("/app", true)} />
        <NavLink href="/app/members" label="Members" icon={ICONS.members} active={isActive("/app/members")} />
        {atLeast(role, "company_admin") && (
          <NavLink href="/app/tokens" label="Deploy tokens" icon={ICONS.token} active={isActive("/app/tokens")} />
        )}
        <NavLink href="/app/settings" label="Settings" icon={ICONS.gear} active={isActive("/app/settings")} />
      </nav>
      <div className="con-side-foot">
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
    <aside className="con-side">
      <Link href="/app" className="con-back app-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
        All projects
      </Link>

      <div className="con-ws app-ident">
        <span className="con-ws-mark" aria-hidden="true">{(project?.name ?? projectId).charAt(0).toUpperCase()}</span>
        <div className="con-ws-meta">
          <div className="con-ws-name">{project?.name ?? "…"}</div>
          <div className="con-ws-plan mono">{project?.slug ?? "loading…"}</div>
        </div>
      </div>

      <nav className="con-nav" aria-label="Project">
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

      <div className="con-side-foot">
        {liveUrl && (
          <a className="con-doclink" href={liveUrl} target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M9 7h8v8" /></svg>
            Open live URL
          </a>
        )}
        <SidebarUser />
      </div>
    </aside>
  );
}
