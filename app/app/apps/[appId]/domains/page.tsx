"use client";

import { use, useEffect, useState } from "react";
import { StatusPill } from "../../../../components/console/StatusPill";
import type { Domain } from "../../../../lib/types";

export default function DomainsPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = use(params);
  const [domains, setDomains] = useState<Domain[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hostname, setHostname] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/apps/${appId}/domains`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Couldn’t load domains."))))
      .then((d) => live && setDomains(d.domains))
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
      const res = await fetch(`/api/apps/${appId}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn’t add the domain.");
      setDomains((d) => [...(d ?? []), data.domain]);
      setNotice(data.message);
      setHostname("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t add the domain.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(dom: Domain) {
    setDomains((d) => (d ?? []).filter((x) => x.id !== dom.id));
    fetch(`/api/apps/${appId}/domains`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostname: dom.hostname }),
    }).catch(() => {});
  }

  const primary = domains?.find((d) => d.primary) ?? null;
  const custom = domains?.filter((d) => !d.primary) ?? [];

  return (
    <div className="con-page">
      <div className="con-head">
        <div>
          <h1 className="con-h1">Domains</h1>
          <p className="con-sub">Connect your own domain to this app.</p>
        </div>
      </div>

      {error && <div className="con-alert err">{error}</div>}

      {/* Default URL — always active, read-only */}
      {primary && (
        <section className="panel pad">
          <div className="fact-k">Default URL — always active</div>
          <div className="domain-host" style={{ marginTop: 8 }}>
            <a href={`https://${primary.hostname}`} target="_blank" rel="noreferrer">{primary.hostname}</a>
            <StatusPill status={primary.status} />
          </div>
        </section>
      )}

      {/* Custom domain — the point of this page */}
      <section className="panel">
        <div className="panel-h"><h2 className="panel-t">Custom domains</h2></div>
        <div className="panel-inner">
          <form className="domain-form" onSubmit={add}>
            <input
              className="con-input mono"
              placeholder="app.yourbusiness.com"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
            />
            <button className="con-btn" type="submit" disabled={busy || !hostname}>Add custom domain</button>
          </form>

          {notice && <div className="con-alert info" style={{ marginTop: 14 }}>{notice}</div>}

          {!domains && !error && <div className="skeleton" style={{ height: 70, marginTop: 14 }} aria-hidden="true" />}

          {domains && custom.length === 0 && (
            <p className="con-sub" style={{ marginTop: 14 }}>
              No custom domain yet. Add one above and we’ll give you the DNS record to point it here.
            </p>
          )}

          {custom.length > 0 && (
            <div className="domain-list" style={{ marginTop: 14 }}>
              {custom.map((d) => (
                <div className="domain-row" key={d.id}>
                  <div className="domain-main">
                    <div className="domain-host">
                      <a href={`https://${d.hostname}`} target="_blank" rel="noreferrer">{d.hostname}</a>
                    </div>
                    {d.status === "pending" && (
                      <div className="domain-dns">
                        Add this DNS record to verify:
                        <code className="dns-record">CNAME&nbsp;&nbsp;{d.hostname}&nbsp;&nbsp;→&nbsp;&nbsp;{d.cnameTarget}</code>
                      </div>
                    )}
                  </div>
                  <StatusPill status={d.status} />
                  <button className="con-linkbtn danger" onClick={() => remove(d)}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <p className="con-sub">Custom domains get automatic HTTPS once DNS verifies. The default URL keeps working either way.</p>
    </div>
  );
}
