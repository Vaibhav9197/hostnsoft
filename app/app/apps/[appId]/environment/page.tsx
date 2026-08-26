"use client";

import { use, useEffect, useState } from "react";
import { relativeTime } from "../../../../lib/format";
import type { EnvVar } from "../../../../lib/types";

export default function EnvironmentPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = use(params);
  const [vars, setVars] = useState<EnvVar[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [secret, setSecret] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let live = true;
    fetch(`/api/apps/${appId}/env`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Couldn’t load variables."))))
      .then((d) => live && setVars(d.vars))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [appId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/apps/${appId}/env`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value, secret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn’t save the variable.");
      const now = new Date().toISOString();
      setVars((v) => {
        const next = (v ?? []).filter((x) => x.key !== key.trim());
        return [{ key: key.trim(), value: secret ? `${value.slice(0, 4)}… (hidden)` : value, secret, updatedAt: now }, ...next];
      });
      setNotice(data.message);
      setKey("");
      setValue("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save the variable.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(k: string) {
    setVars((v) => (v ?? []).filter((x) => x.key !== k));
    fetch(`/api/apps/${appId}/env`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: k }),
    }).catch(() => {});
  }

  return (
    <div className="con-page">
      <div className="con-head">
        <div>
          <h1 className="con-h1">Environment</h1>
          <p className="con-sub">Config and secrets passed to your app at runtime.</p>
        </div>
      </div>

      <form className="env-form" onSubmit={add}>
        <input className="con-input mono" placeholder="KEY" value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} />
        <input className="con-input mono" placeholder="value" value={value} onChange={(e) => setValue(e.target.value)} />
        <label className="env-secret">
          <input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} />
          Secret
        </label>
        <button className="con-btn" type="submit" disabled={busy || !key || !value}>Add</button>
      </form>

      {error && <div className="con-alert err">{error}</div>}
      {notice && <div className="con-alert info">{notice}</div>}

      {!vars && !error && <div className="skeleton" style={{ height: 140 }} aria-hidden="true" />}

      {vars && vars.length === 0 && (
        <div className="con-empty"><h3>No variables</h3><p>Add config and secrets above. They’re injected on the next deploy.</p></div>
      )}

      {vars && vars.length > 0 && (
        <section className="panel">
          <div className="con-scroll">
            <table className="con-table">
              <thead><tr><th>Key</th><th>Value</th><th>Updated</th><th></th></tr></thead>
              <tbody>
                {vars.map((v) => (
                  <tr key={v.key}>
                    <td className="mono">{v.key}</td>
                    <td className="mono env-val">
                      {v.secret && !revealed[v.key] ? (
                        <span className="env-masked">
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="9" rx="1" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                          ••••••••
                          <button className="con-linkbtn" onClick={() => setRevealed((r) => ({ ...r, [v.key]: true }))}>reveal</button>
                        </span>
                      ) : (
                        <span>{v.value}</span>
                      )}
                    </td>
                    <td className="mono-faint">{relativeTime(v.updatedAt)}</td>
                    <td className="row-action"><button className="con-linkbtn danger" onClick={() => remove(v.key)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="con-sub">Changes take effect on the next deploy. Secret values are encrypted and never shown in logs.</p>
    </div>
  );
}
