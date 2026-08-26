"use client";

import { useEffect, useState } from "react";
import { relativeTime } from "../../lib/format";
import type { ApiToken } from "../../lib/types";

export default function TokensPage() {
  const [tokens, setTokens] = useState<ApiToken[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/tokens")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Couldn’t load your tokens."))))
      .then((d) => live && setTokens(d.tokens))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);

  async function createToken(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn’t create the token.");
      setSecret(data.secret);
      setTokens((t) => [data.token, ...(t ?? [])]);
      setName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t create the token.");
    } finally {
      setCreating(false);
    }
  }

  function revoke(id: string) {
    // Dummy: drop it locally. A real impl would DELETE /api/tokens/:id.
    setTokens((t) => (t ?? []).filter((x) => x.id !== id));
  }

  async function copySecret() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="con-page">
      <div className="con-head">
        <div>
          <h1 className="con-h1">Deploy tokens</h1>
          <p className="con-sub">Use a token as <code>HOSTNSOFT_TOKEN</code> to deploy from the skill, CLI, or API.</p>
        </div>
      </div>

      <form className="token-create" onSubmit={createToken}>
        <input
          className="con-input"
          placeholder="Token name — e.g. My laptop, CI"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
        />
        <button className="con-btn" type="submit" disabled={creating}>
          {creating ? "Creating…" : "Create token"}
        </button>
      </form>

      {error && <div className="con-alert err">{error}</div>}

      {secret && (
        <div className="secret-box">
          <div className="secret-head">
            <span className="secret-title">Copy your token now — it won’t be shown again.</span>
            <button className="secret-dismiss" onClick={() => setSecret(null)} aria-label="Dismiss">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="secret-row">
            <code className="secret-val">{secret}</code>
            <button className="con-btn ghost sm" onClick={copySecret}>{copied ? "Copied" : "Copy"}</button>
          </div>
        </div>
      )}

      {!tokens && !error && <div className="app-card skeleton" style={{ height: 120 }} aria-hidden="true" />}

      {tokens && tokens.length === 0 && (
        <div className="con-empty"><h3>No tokens</h3><p>Create one above to start deploying.</p></div>
      )}

      {tokens && tokens.length > 0 && (
        <div className="con-scroll panel">
          <table className="con-table">
            <thead>
              <tr><th>Name</th><th>Token</th><th>Last used</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td className="mono">{t.tokenPrefix}…</td>
                  <td className="mono-faint">{relativeTime(t.lastUsedAt)}</td>
                  <td className="mono-faint">{relativeTime(t.createdAt)}</td>
                  <td className="row-action">
                    <button className="con-linkbtn danger" onClick={() => revoke(t.id)}>Revoke</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
