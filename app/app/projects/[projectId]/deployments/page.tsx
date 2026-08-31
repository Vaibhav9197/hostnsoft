"use client";

import { use, useCallback, useEffect, useState } from "react";
import { StatusPill } from "../../../../components/console/StatusPill";
import { deploymentsApi } from "../../../../lib/hnsApi";
import { relativeTime } from "../../../../lib/format";
import { useSession } from "../../../../lib/session";
import type { Deployment } from "../../../../lib/types";

export default function DeploymentsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { activeCompanyId } = useSession();
  const [deps, setDeps] = useState<Deployment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setDeps(null);
    setError(null);
    try {
      setDeps(await deploymentsApi.list(activeCompanyId, projectId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load deployments.");
    }
  }, [activeCompanyId, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <div className="con-page"><div className="con-alert err">{error}</div></div>;
  if (!deps) return <div className="con-page"><div className="skeleton" style={{ height: 200 }} aria-hidden="true" /></div>;

  const active = deps.find((d) => d.id === selected) ?? null;

  return (
    <div className="con-page">
      <div className="con-head">
        <div>
          <h1 className="con-h1">Deployments</h1>
          <p className="con-sub">Every deploy attempt, newest first.</p>
        </div>
      </div>

      {deps.length === 0 && (
        <div className="con-empty"><h3>No deployments yet</h3><p>Deploys triggered by <code>hostnsoft-deploy</code> show up here.</p></div>
      )}

      {deps.length > 0 && (
        <section className="panel">
          <div className="con-scroll">
            <table className="con-table">
              <thead>
                <tr><th>Deploy</th><th>Status</th><th>App version</th><th>Memory</th><th>By</th><th>When</th></tr>
              </thead>
              <tbody>
                {deps.map((d) => (
                  <tr key={d.version} className={`selectable${active?.id === d.id ? " sel" : ""}`} onClick={() => setSelected(active?.id === d.id ? null : d.id)}>
                    <td className="mono">{d.version}</td>
                    <td><StatusPill status={d.status} /></td>
                    <td className="mono-faint">{d.appVersion}</td>
                    <td className="mono-faint">{d.memoryMb != null ? `${d.memoryMb} MB` : "—"}</td>
                    <td>{d.triggeredBy ?? "—"}</td>
                    <td className="mono-faint">{relativeTime(d.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {active && (
        <section className="panel pad">
          <div className="panel-h" style={{ padding: 0, border: 0, marginBottom: 12 }}>
            <h2 className="panel-t">Deploy {active.version}</h2>
            <StatusPill status={active.status} />
          </div>
          {active.errorDetail && <div className="con-alert err in-panel" style={{ margin: "0 0 12px" }}>{active.errorDetail}</div>}
          <div className="detail-facts flush">
            <div className="fact"><div className="fact-k">App version</div><div className="fact-v mono">{active.appVersion}</div></div>
            <div className="fact"><div className="fact-k">Image tag</div><div className="fact-v mono">{active.imageTag ?? "—"}</div></div>
            <div className="fact"><div className="fact-k">Memory</div><div className="fact-v mono">{active.memoryMb != null ? `${active.memoryMb} MB` : "—"}</div></div>
            <div className="fact"><div className="fact-k">Triggered by</div><div className="fact-v">{active.triggeredBy ?? "—"}</div></div>
            <div className="fact"><div className="fact-k">Started</div><div className="fact-v">{relativeTime(active.createdAt)}</div></div>
            <div className="fact"><div className="fact-k">Finished</div><div className="fact-v">{active.finishedAt ? relativeTime(active.finishedAt) : "—"}</div></div>
          </div>
        </section>
      )}
    </div>
  );
}
