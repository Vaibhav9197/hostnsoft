"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { relativeTime } from "../../../../lib/format";
import { useApp } from "../../../../lib/useApp";

export default function AppSettingsPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = use(params);
  const { app, error } = useApp(appId);
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function del() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/apps/${appId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Couldn’t delete the app.");
      router.push("/app");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn’t delete the app.");
      setBusy(false);
    }
  }

  if (error) return <div className="con-page"><div className="con-alert err">{error}</div></div>;
  if (!app) return <div className="con-page"><div className="skeleton" style={{ height: 160 }} aria-hidden="true" /></div>;

  return (
    <div className="con-page">
      <div className="con-head">
        <div>
          <h1 className="con-h1">Settings</h1>
          <p className="con-sub">Configuration for {app.name}.</p>
        </div>
      </div>

      <section className="panel pad">
        <h2 className="panel-t">App</h2>
        <div className="detail-facts flush">
          <div className="fact"><div className="fact-k">Name</div><div className="fact-v mono">{app.name}</div></div>
          <div className="fact"><div className="fact-k">App ID</div><div className="fact-v mono">{app.id}</div></div>
          <div className="fact"><div className="fact-k">Stack</div><div className="fact-v">{app.stack ?? "—"}</div></div>
          <div className="fact"><div className="fact-k">Database</div><div className="fact-v">{app.hasDatabase ? "PGlite (persisted in DATA_DIR)" : "None"}</div></div>
          <div className="fact"><div className="fact-k">Memory</div><div className="fact-v mono">{app.memoryMb ? `${app.memoryMb} MB` : "—"}</div></div>
          <div className="fact"><div className="fact-k">Created</div><div className="fact-v">{relativeTime(app.createdAt)}</div></div>
        </div>
        <p className="con-sub" style={{ marginTop: "1rem" }}>
          Config and secrets live under <b>Environment</b>; custom domains under <b>Domains</b>.
        </p>
      </section>

      <section className="panel pad danger">
        <h2 className="panel-t">Danger zone</h2>
        <p className="con-sub" style={{ marginTop: 4 }}>
          Deleting <b>{app.name}</b> stops it serving and removes its deployments. This can’t be undone.
        </p>
        {err && <div className="con-alert err" style={{ marginTop: 12 }}>{err}</div>}
        <div className="danger-row">
          <input
            className="con-input"
            placeholder={`Type “${app.name}” to confirm`}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button
            className="con-btn danger"
            disabled={busy || confirm !== app.name}
            onClick={del}
          >
            {busy ? "Deleting…" : "Delete app"}
          </button>
        </div>
      </section>
    </div>
  );
}
