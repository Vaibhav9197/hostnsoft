"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { StatusPill } from "../components/console/StatusPill";
import { USER, WORKSPACE } from "../lib/dummy";
import { useApp } from "../lib/useApp";

const WS_NAV = [
  { href: "/app", label: "Overview", exact: true, icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
  { href: "/app/tokens", label: "Deploy tokens", icon: "M15 7a4 4 0 1 0-3.9 5H13l2 2 2-2 2 2 2-2-3-3a4 4 0 0 0-1-2Z" },
  { href: "/app/settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 12h1M19 12h1M12 4v1M12 19v1M6 6l1 1M17 17l1 1M18 6l-1 1M7 17l-1 1" },
];

const APP_NAV = [
  { seg: "", label: "Overview", icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
  { seg: "deployments", label: "Deployments", icon: "M12 15V4m0 0-4 4m4-4 4 4M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" },
  { seg: "logs", label: "Logs", icon: "M5 5h14M5 12h14M5 19h9" },
  { seg: "environment", label: "Environment", icon: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" },
  { seg: "domains", label: "Domains", icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" },
  { seg: "settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 12h1M19 12h1M12 4v1M12 19v1M6 6l1 1M17 17l1 1M18 6l-1 1M7 17l-1 1" },
];

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const appMatch = pathname.match(/^\/app\/apps\/([^/]+)/);
  const appId = appMatch?.[1] ?? null;

  return (
    <div className="console">
      {appId ? (
        <AppSidebar appId={appId} pathname={pathname} />
      ) : (
        <WorkspaceSidebar pathname={pathname} />
      )}

      <div className="con-main">
        <header className="con-top">
          <div className="con-top-title" />
          <div className="con-user">
            <div className="con-user-meta">
              <div className="con-user-name">{USER.name}</div>
              <div className="con-user-mail">{USER.email}</div>
            </div>
            <span className="con-avatar" aria-hidden="true">{USER.name.charAt(0)}</span>
            <button
              type="button"
              className="con-logout"
              onClick={() => router.push("/")}
              aria-label="Log out"
              title="Log out"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            </button>
          </div>
        </header>
        <main className="con-content">{children}</main>
      </div>
    </div>
  );
}

function WorkspaceSidebar({ pathname }: { pathname: string }) {
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="con-side">
      <div className="con-ws">
        <span className="con-ws-mark" aria-hidden="true">{WORKSPACE.name.charAt(0)}</span>
        <div className="con-ws-meta">
          <div className="con-ws-name">{WORKSPACE.name}</div>
          <div className="con-ws-plan">Early access</div>
        </div>
      </div>

      <nav className="con-nav" aria-label="Console">
        {WS_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`con-link${isActive(item.href, item.exact) ? " active" : ""}`}
            aria-current={isActive(item.href, item.exact) ? "page" : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="con-side-foot">
        <a className="con-doclink" href="/skills/hostnsoft-deploy.skill" download>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" /></svg>
          Deploy skill
        </a>
      </div>
    </aside>
  );
}

function AppSidebar({ appId, pathname }: { appId: string; pathname: string }) {
  const { app } = useApp(appId);
  const base = `/app/apps/${appId}`;

  const isActive = (seg: string) => {
    const href = seg ? `${base}/${seg}` : base;
    return seg ? pathname.startsWith(href) : pathname === base;
  };

  return (
    <aside className="con-side">
      <Link href="/app" className="con-back app-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
        All apps
      </Link>

      <div className="con-ws app-ident">
        <span className="con-ws-mark" aria-hidden="true">{(app?.name ?? appId).charAt(0)}</span>
        <div className="con-ws-meta">
          <div className="con-ws-name">{app?.name ?? "…"}</div>
          {app ? <StatusPill status={app.status} /> : <div className="con-ws-plan">loading…</div>}
        </div>
      </div>

      <nav className="con-nav" aria-label="App">
        {APP_NAV.map((item) => {
          const href = item.seg ? `${base}/${item.seg}` : base;
          return (
            <Link
              key={item.label}
              href={href}
              className={`con-link${isActive(item.seg) ? " active" : ""}`}
              aria-current={isActive(item.seg) ? "page" : undefined}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="con-side-foot">
        {app?.url && (
          <a className="con-doclink" href={app.url} target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M9 7h8v8" /></svg>
            Open live URL
          </a>
        )}
      </div>
    </aside>
  );
}
