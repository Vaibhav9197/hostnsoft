"use client";

import { useCallback, useEffect, useState } from "react";
import { tokensApi } from "../../lib/hnsApi";
import { formatDate, relativeTime } from "../../lib/format";
import { atLeast, useSession } from "../../lib/session";
import type { DeployToken, DeployTokenSecret } from "../../lib/types";

export default function TokensPage() {
  const { activeCompanyId, role } = useSession();
  const isAdmin = atLeast(role, "company_admin");
  const [tokens, setTokens] = useState<DeployToken[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState<DeployTokenSecret | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setTokens(null);
    setError(null);
    try {
      setTokens(await tokensApi.list(activeCompanyId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load your tokens.");
    }
  }, [activeCompanyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createToken(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    setCreating(true);
    setError(null);
    try {
      const created = await tokensApi.create(activeCompanyId, label.trim());
      setSecret(created);
      setLabel("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t create the token.");
    } finally {
      setCreating(false);
    }
  }

  async function rotate(id: string) {
    if (!activeCompanyId) return;
    setError(null);
    try {
      const rotated = await tokensApi.rotate(activeCompanyId, id);
      setSecret(rotated);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t rotate the token.");
    }
  }

  async function revoke(id: string) {
    if (!activeCompanyId) return;
    setError(null);
    const prev = tokens;
    setTokens((t) => (t ?? []).filter((x) => x.id !== id));
    try {
      await tokensApi.revoke(activeCompanyId, id);
    } catch (e) {
      setTokens(prev ?? null);
      setError(e instanceof Error ? e.message : "Couldn’t revoke the token.");
    }
  }

  async function copySecret() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="con-page">
        <div className="con-head"><div><h1 className="con-h1">Deploy tokens</h1></div></div>
        <div className="con-empty"><h3>Company admins only</h3><p>Deploy tokens are managed by company admins. Ask one to create a token for your CI pipeline.</p></div>
      </div>
    );
  }

  return (
    <div className="con-page">
      <div className="con-head">
        <div>
          <h1 className="con-h1">Deploy tokens</h1>
          <p className="con-sub">Credentials <code>hostnsoft-deploy</code> checks on every deploy. Not used to sign in here.</p>
        </div>
      </div>

      <form className="token-create" onSubmit={createToken}>
        <input className="con-input" placeholder="Label — e.g. CI pipeline" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} />
        <button className="con-btn" type="submit" disabled={creating || !label.trim()}>{creating ? "Creating…" : "Create token"}</button>
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
            <code className="secret-val">{secret.token}</code>
            <button className="con-btn ghost sm" onClick={copySecret}>{copied ? "Copied" : "Copy"}</button>
          </div>
          {secret.oldTokenValidUntil && (
            <div className="secret-foot mono-faint">The previous token keeps working until {new Date(secret.oldTokenValidUntil).toLocaleString()}.</div>
          )}
        </div>
      )}

      {!tokens && !error && <div className="app-card skeleton" style={{ height: 120 }} aria-hidden="true" />}

      {tokens && tokens.length === 0 && (
        <div className="con-empty"><h3>No tokens</h3><p>Create one above to let a CI pipeline deploy.</p></div>
      )}

      {tokens && tokens.length > 0 && (
        <div className="con-scroll panel">
          <table className="con-table">
            <thead><tr><th>Label</th><th>Token</th><th>Last used</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {tokens.map((t) => {
                const revoked = t.revokedAt != null && new Date(t.revokedAt).getTime() <= Date.now();
                const rotating = t.revokedAt != null && !revoked;
                return (
                  <tr key={t.id} className={revoked ? "row-dim" : ""}>
                    <td>{t.label}</td>
                    <td className="mono">{t.tokenPrefix}…{rotating && <span className="tag-grace">rotating · valid until {new Date(t.revokedAt!).toLocaleTimeString()}</span>}</td>
                    <td className="mono-faint">{relativeTime(t.lastUsedAt)}</td>
                    <td className="mono-faint">{formatDate(t.createdAt)}</td>
                    <td className="row-action">
                      {!revoked && (
                        <>
                          <button className="con-linkbtn" onClick={() => rotate(t.id)}>Rotate</button>
                          <button className="con-linkbtn danger" style={{ marginLeft: 14 }} onClick={() => revoke(t.id)}>Revoke</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="con-sub"><b>Rotate</b> for routine hygiene — the old token keeps working for an hour. <b>Revoke</b> immediately if a token leaked.</p>
    </div>
  );
}
