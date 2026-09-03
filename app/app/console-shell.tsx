"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { LoginScreen } from "../components/console/LoginScreen";
import { Alert } from "../components/console/kit";
import { atLeast, SessionProvider, useSession } from "../lib/session";
import { ROLE_LABEL } from "../lib/format";
import { useProject } from "../lib/useProject";
import { useIsMobile } from "../hooks/use-mobile";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/app/components/ui/sidebar";

const ICONS = {
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  members: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  token: "M15 7a4 4 0 1 0-3.9 5H13l2 2 2-2 2 2 2-2-3-3a4 4 0 0 0-1-2Z",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 12h1M19 12h1M12 4v1M12 19v1M6 6l1 1M17 17l1 1M18 6l-1 1M7 17l-1 1",
  deploy: "M12 15V4m0 0-4 4m4-4 4 4M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3",
  env: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
};

export function ConsoleShell({
  children,
  defaultSidebarOpen,
}: {
  children: React.ReactNode;
  /** Read from the sidebar_state cookie by the server layout, so the sidebar
   *  renders in its remembered state instead of flashing open on every load. */
  defaultSidebarOpen: boolean;
}) {
  return (
    <SessionProvider>
      <SidebarProvider defaultOpen={defaultSidebarOpen}>
        <Shell>{children}</Shell>
      </SidebarProvider>
    </SessionProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { status, apiConnected, companies } = useSession();
  const hasNoCompanies = companies.length === 0;

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3.5 bg-background" role="status" aria-live="polite">
        <span className="size-6 animate-spin rounded-full border-2 border-input border-t-primary" aria-hidden="true" />
        <span className="font-mono text-[0.78rem] text-faint">Loading your workspace…</span>
      </div>
    );
  }

  if (status === "anon") return <LoginScreen />;

  if (hasNoCompanies) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="ml-auto p-5">
          <SidebarUser />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <main className="w-full max-w-5xl px-8 py-8">
            {!apiConnected && (
              <Alert variant="warn" className="mb-6">
                You're signed in, but the hostnsoft-api service is unreachable right now — company and
                project data can't be loaded until it's back.
              </Alert>
            )}
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 sm:px-8">
          <SidebarTrigger />
        </header>
        <main className="flex-1">
          <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
            {!apiConnected && (
              <Alert variant="warn" className="mb-6">
                You're signed in, but the hostnsoft-api service is unreachable right now — company and
                project data can't be loaded until it's back.
              </Alert>
            )}
            {children}
          </div>
        </main>
      </div>
    </>
  );
}

function AppSidebar() {
  const pathname = usePathname();
  const projectMatch = pathname.match(/^\/app\/projects\/([^/]+)/);
  const projectId = projectMatch?.[1] ?? null;
  const { setOpen } = useSidebar();
  const isMobile = useIsMobile();

  const handleNavClick = () => {
    // Only close sidebar on mobile
    if (isMobile) {
      setOpen(false);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {projectId ? (
          <ProjectSidebarHeader projectId={projectId} />
        ) : (
          <CompanySwitcher />
        )}
      </SidebarHeader>
      <SidebarContent>
        {projectId ? (
          <ProjectNavigation projectId={projectId} pathname={pathname} onNavClick={handleNavClick} />
        ) : (
          <WorkspaceNavigation pathname={pathname} onNavClick={handleNavClick} />
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarUser />
      </SidebarFooter>
    </Sidebar>
  );
}

function CompanySwitcher() {
  const { activeCompany } = useSession();
  const pathname = usePathname();
  const active = activeCompany;
  const onSwitchPage = pathname === "/app/switch-company";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          isActive={onSwitchPage}
          tooltip={active?.companyName ?? "Switch company"}
          className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          asChild
        >
          <Link href="/app/switch-company">
            <div className="grid size-8 shrink-0 place-items-center rounded-md bg-foreground text-sm font-extrabold text-background">
              {(active?.companyName ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
              <span className="truncate font-semibold">{active?.companyName ?? "—"}</span>
              <span className="truncate text-xs text-sidebar-foreground/60">{active ? ROLE_LABEL[active.role] : "Switch company"}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 shrink-0 group-data-[collapsible=icon]:hidden" />
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function ProjectSidebarHeader({ projectId }: { projectId: string }) {
  const { activeCompanyId } = useSession();
  const { project } = useProject(activeCompanyId, projectId);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="All projects" className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
          <Link href="/app">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
            <span>All projects</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5 group-data-[collapsible=icon]:px-0">
          <div className="grid size-8 shrink-0 place-items-center rounded-md bg-foreground text-sm font-extrabold text-background">
            {(project?.name ?? projectId).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-sm font-semibold text-sidebar-foreground">{project?.name ?? "…"}</div>
            <div className="truncate text-xs text-sidebar-foreground/60">{project?.slug ?? "loading…"}</div>
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function WorkspaceNavigation({ pathname, onNavClick }: { pathname: string; onNavClick: () => void }) {
  const { role } = useSession();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <SidebarGroup>
      <SidebarMenu>
        <NavItem href="/app" label="Projects" icon={ICONS.grid} active={isActive("/app", true)} onClick={onNavClick} />
        <NavItem href="/app/members" label="Members" icon={ICONS.members} active={isActive("/app/members")} onClick={onNavClick} />
        {atLeast(role, "company_admin") && (
          <NavItem href="/app/tokens" label="Deploy tokens" icon={ICONS.token} active={isActive("/app/tokens")} onClick={onNavClick} />
        )}
        <NavItem href="/app/settings" label="Settings" icon={ICONS.gear} active={isActive("/app/settings")} onClick={onNavClick} />
      </SidebarMenu>
    </SidebarGroup>
  );
}

function ProjectNavigation({ projectId, pathname, onNavClick }: { projectId: string; pathname: string; onNavClick: () => void }) {
  const base = `/app/projects/${projectId}`;
  const nav = [
    { seg: "", label: "Overview", icon: ICONS.grid },
    { seg: "deployments", label: "Deployments", icon: ICONS.deploy },
    { seg: "environment", label: "Environment", icon: ICONS.env },
    { seg: "settings", label: "Settings", icon: ICONS.gear },
  ];
  const isActive = (seg: string) => (seg ? pathname.startsWith(`${base}/${seg}`) : pathname === base);

  return (
    <SidebarGroup>
      <SidebarMenu>
        {nav.map((item) => (
          <NavItem
            key={item.label}
            href={item.seg ? `${base}/${item.seg}` : base}
            label={item.label}
            icon={item.icon}
            active={isActive(item.seg)}
            onClick={onNavClick}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

interface NavItemProps {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}

function NavItem({ href, label, icon, active, onClick }: NavItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={label}>
        <Link href={href} onClick={onClick}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0">
            <path d={icon} />
          </svg>
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarUser() {
  const { user, signOut } = useSession();
  const label = user?.name || user?.email || "";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-3 rounded-lg border border-sidebar-border px-2 py-2.5 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:p-0">
          <span
            title={label}
            className="grid size-9 shrink-0 place-items-center rounded-md bg-foreground text-sm font-bold text-background group-data-[collapsible=icon]:size-8"
          >
            {label.charAt(0).toUpperCase() || "?"}
          </span>
          <div className="min-w-0 flex-1 text-left leading-snug group-data-[collapsible=icon]:hidden">
            <div className="truncate text-[0.85rem] font-semibold text-sidebar-foreground">{user?.name || "—"}</div>
            <div className="truncate text-[0.75rem] text-sidebar-foreground/60">{user?.email}</div>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            aria-label="Log out"
            title="Log out"
            className="grid size-8 shrink-0 place-items-center rounded-md border border-sidebar-border hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
