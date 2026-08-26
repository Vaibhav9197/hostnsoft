"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { USER, WORKSPACE } from "../lib/dummy";

const NAV = [
  { href: "/app", label: "Overview", exact: true, icon: "M3 3v18h18M7 15l3-4 3 3 4-6" },
  { href: "/app/tokens", label: "Deploy tokens", icon: "M15 7a4 4 0 1 0-3.9 5H13l2 2 2-2 2 2 2-2-3-3a4 4 0 0 0-1-2Z" },
  { href: "/app/settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 12h1M19 12h1M12 4v1M12 19v1M6 6l1 1M17 17l1 1M18 6l-1 1M7 17l-1 1" },
];

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="console">
      <aside className="con-side">
        <div className="con-ws">
          <span className="con-ws-mark" aria-hidden="true">{WORKSPACE.name.charAt(0)}</span>
          <div className="con-ws-meta">
            <div className="con-ws-name">{WORKSPACE.name}</div>
            <div className="con-ws-plan">Early access</div>
          </div>
        </div>

        <nav className="con-nav" aria-label="Console">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`con-link${isActive(item.href, item.exact) ? " active" : ""}`}
              aria-current={isActive(item.href, item.exact) ? "page" : undefined}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="con-side-foot">
          <a className="con-doclink" href="#" target="_blank" rel="noreferrer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h11l5 5v11H4zM15 4v5h5" /></svg>
            Deploy guide
          </a>
        </div>
      </aside>

      <div className="con-main">
        <header className="con-top">
          <div className="con-top-title" id="con-title" />
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
