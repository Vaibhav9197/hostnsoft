"use client";

import Link from "next/link";
import { use, useState } from "react";
import { StatusPill } from "../../../components/console/StatusPill";
import { relativeTime } from "../../../lib/format";
import { useApp } from "../../../lib/useApp";

export default function AppOverviewPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = use(params);
  const { app, error } = useApp(appId);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function redeploy() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/apps/${appId}/redeploy`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "That didn’t go through.");
      setNotice(data.message ?? "Redeploy queued.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "That didn’t go through.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="con-page"><div className="con-alert err">{error}</div></div>;
  if (!app) return <div className="con-page"><div className="skeleton" style={{ height: 120 }} aria-hidden="true" /></div>;

  const current = app.deployments.find((d) => d.status === "live") ?? app.deployments[0];

  return (
    <div className="con-page">
      <div className="con-head">
        <div>
          <h1 className="con-h1">Overview</h1>
          <p className="con-sub">Live status and current deployment.</p>
        </div>
        <div className="detail-actions">
          <button className="con-btn ghost" disabled={busy} onClick={redeploy}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
            Redeploy
          </button>
          {app.url && (
            <a className="con-btn" href={app.url} target="_blank" rel="noreferrer">
              Open live URL
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M9 7h8v8" /></svg>
            </a>
          )}
        </div>
      </div>

      {notice && <div className="con-alert info">{notice}</div>}

      <div className="detail-facts">
        <Fact k="Live URL" v={app.url ? <a href={app.url} target="_blank" rel="noreferrer">{app.url.replace(/^https?:\/\//, "")}</a> : "—"} />
        <Fact k="Version" v={app.currentVersion ?? "—"} mono />
        <Fact k="Stack" v={app.stack ?? "—"} />
        <Fact k="Database" v={app.hasDatabase ? "PGlite" : "None"} />
        <Fact k="Memory" v={app.memoryMb ? `${app.memoryMb} MB` : "—"} mono />
        <Fact k="Created" v={relativeTime(app.createdAt)} />
      </div>

      {current && (
        <section className="panel pad">
          <div className="latest-dep">
            <div>
              <div className="fact-k">Latest deployment</div>
              <div className="latest-ver">
                <span className="mono">{current.version}</span>
                <StatusPill status={current.status} />
              </div>
              <div className="mono-faint">
                via {current.trigger} · {relativeTime(current.createdAt)}
                {current.createdBy ? ` · ${current.createdBy}` : ""}
              </div>
            </div>
            <div className="latest-links">
              <Link className="con-btn ghost sm" href={`/app/apps/${appId}/deployments`}>Deploy history</Link>
              <Link className="con-btn ghost sm" href={`/app/apps/${appId}/logs`}>Logs</Link>
            </div>
          </div>
          {current.errorMessage && <div className="con-alert err in-panel" style={{ marginTop: 14 }}>{current.errorMessage}</div>}
        </section>
      )}
    </div>
  );
}

function Fact({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="fact">
      <div className="fact-k">{k}</div>
      <div className={`fact-v${mono ? " mono" : ""}`}>{v}</div>
    </div>
  );
}
