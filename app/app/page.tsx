"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusPill } from "../components/console/StatusPill";
import { relativeTime } from "../lib/format";
import type { AppSummary } from "../lib/types";

export default function OverviewPage() {
  const [apps, setApps] = useState<AppSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/apps")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Couldn’t load your apps."))))
      .then((d) => live && setApps(d.apps))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="con-page">
      <div className="con-head">
        <div>
          <h1 className="con-h1">Your apps</h1>
          <p className="con-sub">Everything you’ve deployed to this workspace.</p>
        </div>
        <Link href="/app/tokens" className="con-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          Deploy an app
        </Link>
      </div>

      <OnboardingStrip />

      {error && <div className="con-alert err">{error}</div>}

      {!apps && !error && (
        <div className="app-grid">
          {[0, 1, 2].map((i) => (
            <div className="app-card skeleton" key={i} aria-hidden="true" />
          ))}
        </div>
      )}

      {apps && apps.length === 0 && (
        <div className="con-empty">
          <h3>No apps yet</h3>
          <p>Deploy your first app with the steps above and it’ll show up here — live URL and all.</p>
        </div>
      )}

      {apps && apps.length > 0 && (
        <div className="app-grid">
          {apps.map((app) => (
            <Link key={app.id} href={`/app/apps/${app.id}`} className="app-card">
              <div className="app-card-top">
                <span className="app-name">{app.name}</span>
                <StatusPill status={app.status} />
              </div>
              <div className="app-url">
                {app.url ? app.url.replace(/^https?:\/\//, "") : "Not deployed yet"}
              </div>
              <div className="app-meta">
                <span>{app.stack ?? "—"}</span>
                <span className="dot-sep" />
                <span>{app.hasDatabase ? "Database" : "No DB"}</span>
                <span className="dot-sep" />
                <span>{app.currentVersion ?? "—"}</span>
              </div>
              <div className="app-foot">
                <span className="mono-faint">Deployed {relativeTime(app.lastDeployAt)}</span>
                <svg className="app-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function OnboardingStrip() {
  return (
    <details className="onboard">
      <summary>
        <span className="onboard-badge">New</span>
        Deploy an app in three steps
        <span className="onboard-chev" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </summary>
      <div className="onboard-body">
        <ol className="onboard-steps">
          <li>
            <b>Get a deploy token.</b> Create one on the{" "}
            <Link href="/app/tokens">Deploy tokens</Link> page and export it:
            <pre className="con-pre">export HOSTNSOFT_TOKEN=&quot;hns_live_…&quot;</pre>
          </li>
          <li>
            <b>Install the skill</b> in Claude Code / Cowork, or use the CLI. Make sure your app
            reads <code>PORT</code> and binds to <code>0.0.0.0</code> — no Dockerfile needed.
          </li>
          <li>
            <b>Ship it.</b> Tell your agent “deploy this,” and the app appears here with its URL.
            <pre className="con-pre">curl -X POST https://ship.hostnsoft.com/apps \
  -H &quot;Authorization: Bearer $HOSTNSOFT_TOKEN&quot; \
  -H &quot;X-App-Name: my-app&quot; -H &quot;X-App-Version: v1&quot; \
  -F &quot;source=@/tmp/my-app.tar.gz&quot;</pre>
          </li>
        </ol>
      </div>
    </details>
  );
}
