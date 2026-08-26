"use client";

import { use, useState } from "react";
import { StatusPill } from "../../../../components/console/StatusPill";
import { formatBytes, relativeTime } from "../../../../lib/format";
import { useApp } from "../../../../lib/useApp";

export default function DeploymentsPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = use(params);
  const { app, error } = useApp(appId);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  async function rollback(version: string) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/apps/${appId}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Rollback failed.");
      setNotice(data.message ?? "Rollback queued.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Rollback failed.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="con-page"><div className="con-alert err">{error}</div></div>;
  if (!app) return <div className="con-page"><div className="skeleton" style={{ height: 200 }} aria-hidden="true" /></div>;

  const activeDep = app.deployments.find((d) => d.id === selected)
    ?? app.deployments.find((d) => d.status === "live")
    ?? app.deployments[0];
  const activeEvents = app.events.filter((e) => e.deploymentId === activeDep?.id);

  return (
    <div className="con-page">
      <div className="con-head">
        <div>
          <h1 className="con-h1">Deployments</h1>
          <p className="con-sub">Every version shipped to this app.</p>
        </div>
      </div>

      {notice && <div className="con-alert info">{notice}</div>}

      <section className="panel">
        <div className="con-scroll">
          <table className="con-table">
            <thead>
              <tr><th>Version</th><th>Status</th><th>Trigger</th><th>Source</th><th>By</th><th>When</th><th></th></tr>
            </thead>
            <tbody>
              {app.deployments.map((d) => (
                <tr
                  key={d.id}
                  className={`selectable${activeDep?.id === d.id ? " sel" : ""}`}
                  onClick={() => setSelected(d.id)}
                >
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
                        onClick={(e) => { e.stopPropagation(); rollback(d.version); }}
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

      {activeDep && (
        <section className="panel">
          <div className="panel-h">
            <h2 className="panel-t">Build &amp; deploy log</h2>
            <span className="mono-faint">{activeDep.version}</span>
          </div>
          {activeDep.errorMessage && <div className="con-alert err in-panel">{activeDep.errorMessage}</div>}
          <ol className="log">
            {activeEvents.map((e) => (
              <li key={e.id} className={`log-line lv-${e.level}`}>
                <span className="log-phase">{e.phase}</span>
                <span className="log-msg">{e.message}</span>
                <span className="log-time">{new Date(e.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              </li>
            ))}
            {activeEvents.length === 0 && (
              <li className="log-line"><span className="log-msg mono-faint">No build log for this deploy.</span></li>
            )}
          </ol>
        </section>
      )}
    </div>
  );
}
