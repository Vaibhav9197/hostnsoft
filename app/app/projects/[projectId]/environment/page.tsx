"use client";

import { use, useCallback, useEffect, useState } from "react";
import { envVarsApi } from "../../../../lib/hnsApi";
import { relativeTime } from "../../../../lib/format";
import { atLeast, useSession } from "../../../../lib/session";
import type { EnvVar } from "../../../../lib/types";

export default function EnvironmentPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { activeCompanyId, role } = useSession();
  const canWrite = atLeast(role, "project_admin");
  const [vars, setVars] = useState<EnvVar[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setVars(null);
    setError(null);
    try {
      setVars(await envVarsApi.list(activeCompanyId, projectId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load variables.");
    }
  }, [activeCompanyId, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function upsert(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      // Bulk-upsert endpoint; we send a single pair. Existing keys omitted are left as-is.
      await envVarsApi.set(activeCompanyId, projectId, [{ key: key.trim(), value }]);
      setNotice(`${key.trim()} saved. Applies on the next deploy.`);
      setKey("");
      setValue("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save the variable.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(k: string) {
    if (!activeCompanyId) return;
    const prev = vars;
    setVars((v) => (v ?? []).filter((x) => x.key !== k));
    try {
      await envVarsApi.remove(activeCompanyId, projectId, k);
    } catch (e) {
      setVars(prev ?? null);
      setError(e instanceof Error ? e.message : "Couldn’t remove the variable.");
    }
  }

  return (
    <div className="con-page">
      <div className="con-head">
        <div>
          <h1 className="con-h1">Environment</h1>
          <p className="con-sub">Config and secrets stored for this project.</p>
        </div>
      </div>

      {canWrite && (
        <form className="env-form" onSubmit={upsert}>
          <input className="con-input mono" placeholder="KEY" value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} />
          <input className="con-input mono" placeholder="value" value={value} onChange={(e) => setValue(e.target.value)} />
          <button className="con-btn" type="submit" disabled={busy || !key.trim() || !value}>Save</button>
        </form>
      )}

      {error && <div className="con-alert err">{error}</div>}
      {notice && <div className="con-alert info">{notice}</div>}

      {!vars && !error && <div className="skeleton" style={{ height: 140 }} aria-hidden="true" />}

      {vars && vars.length === 0 && (
        <div className="con-empty"><h3>No variables</h3><p>{canWrite ? "Add config and secrets above." : "No variables set for this project."}</p></div>
      )}

      {vars && vars.length > 0 && (
        <section className="panel">
          <div className="con-scroll">
            <table className="con-table">
              <thead><tr><th>Key</th><th>Value</th><th>Updated</th>{canWrite && <th></th>}</tr></thead>
              <tbody>
                {vars.map((v) => (
                  <tr key={v.key}>
                    <td className="mono">{v.key}</td>
                    <td className="mono env-val">
                      {!revealed[v.key] ? (
                        <span className="env-masked">
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="9" rx="1" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                          ••••••••
                          <button className="con-linkbtn" onClick={() => setRevealed((r) => ({ ...r, [v.key]: true }))}>reveal</button>
                        </span>
                      ) : (
                        <span className="env-shown">{v.value}<button className="con-linkbtn" style={{ marginLeft: 10 }} onClick={() => setRevealed((r) => ({ ...r, [v.key]: false }))}>hide</button></span>
                      )}
                    </td>
                    <td className="mono-faint">{relativeTime(v.updatedAt)}</td>
                    {canWrite && <td className="row-action"><button className="con-linkbtn danger" onClick={() => remove(v.key)}>Remove</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="con-sub">Saved changes are stored here but <b>don’t reach the running app yet</b> — there’s no redeploy trigger, so they apply on the next deploy.</p>
    </div>
  );
}
