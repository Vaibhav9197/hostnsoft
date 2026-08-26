"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { StatusPill } from "../../../components/console/StatusPill";
import { formatBytes, relativeTime } from "../../../lib/format";
import type { AppDetail } from "../../../lib/types";

export default function AppDetailPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = use(params);
  const [app, setApp] = useState<AppDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/apps/${appId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("This app couldn’t be found."))))
      .then((d) => live && setApp(d.app))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [appId]);

  async function action(path: string, body?: object) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/apps/${appId}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "That action didn’t go through.");
      setNotice(data.message ?? "Done.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "That action didn’t go through.");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="con-page">
        <BackLink />
        <div className="con-alert err">{error}</div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="con-page">
        <BackLink />
        <div className="detail-head skeleton" style={{ height: 120 }} aria-hidden="true" />
      </div>
    );
  }

  const current = app.deployments.find((d) => d.status === "live") ?? app.deployments[0];

  return (
    <div className="con-page">
      <BackLink />

      <div className="detail-head">
        <div className="detail-id">
          <h1 className="con-h1">{app.name}</h1>
          <StatusPill status={app.status} />
        </div>
        <div className="detail-actions">
          <button className="con-btn ghost" disabled={busy} onClick={() => action("redeploy")}>
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

      <div className="detail-grid">
        <section className="panel">
          <div className="panel-h"><h2 className="panel-t">Deploy history</h2></div>
          <div className="con-scroll">
            <table className="con-table">
              <thead>
                <tr><th>Version</th><th>Status</th><th>Trigger</th><th>Source</th><th>By</th><th>When</th><th></th></tr>
              </thead>
              <tbody>
                {app.deployments.map((d) => (
                  <tr key={d.id}>
                    <td className="mono">{d.version}</td>
                    <td><StatusPill status={d.status} /></td>
                    <td className="mono-faint">{d.trigger}</td>
                    <td className="mono-faint">{formatBytes(d.sourceBytes)}</td>
                    <td>{d.createdBy ?? "—"}</td>
                    <td className="mono-faint">{relativeTime(d.createdAt)}</td>
                    <td className="row-action">
                      {d.status === "superseded" && (
                        <button
                          className="con-linkbtn"
                          disabled={busy}
                          onClick={() => action("rollback", { version: d.version })}
                        >
                          Roll back
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-h">
            <h2 className="panel-t">Latest deploy log</h2>
            {current && <span className="mono-faint">{current.version}</span>}
          </div>
          {current?.errorMessage && (
            <div className="con-alert err in-panel">{current.errorMessage}</div>
          )}
          <ol className="log">
            {app.events
              .filter((e) => e.deploymentId === current?.id)
              .map((e) => (
                <li key={e.id} className={`log-line lv-${e.level}`}>
                  <span className="log-phase">{e.phase}</span>
                  <span className="log-msg">{e.message}</span>
                  <span className="log-time">{new Date(e.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                </li>
              ))}
            {app.events.filter((e) => e.deploymentId === current?.id).length === 0 && (
              <li className="log-line"><span className="log-msg mono-faint">No log lines for this deploy yet.</span></li>
            )}
          </ol>
        </section>
      </div>
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

function BackLink() {
  return (
    <Link href="/app" className="con-back">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
      All apps
    </Link>
  );
}
