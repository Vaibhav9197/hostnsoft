"use client";

import { use, useEffect, useState } from "react";

type LogLine = { ts: string; level: "info" | "warn" | "error"; message: string };

export default function LogsPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = use(params);
  const [lines, setLines] = useState<LogLine[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/apps/${appId}/logs`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Couldn’t load logs."))))
      .then((d) => live && setLines(d.lines))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [appId]);

  return (
    <div className="con-page">
      <div className="con-head">
        <div>
          <h1 className="con-h1">Logs</h1>
          <p className="con-sub">Recent runtime output from your app.</p>
        </div>
      </div>

      {error && <div className="con-alert err">{error}</div>}

      <section className="panel term">
        <div className="term-bar">
          <span className="term-dot" /><span className="term-dot" /><span className="term-dot" />
          <span className="term-label">stdout · stderr</span>
        </div>
        {!lines && !error && <div className="term-body"><span className="mono-faint">Loading…</span></div>}
        {lines && (
          <div className="term-body">
            {lines.map((l, i) => (
              <div key={i} className={`term-line lv-${l.level}`}>
                <span className="term-ts">{new Date(l.ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                <span className="term-lvl">{l.level}</span>
                <span className="term-msg">{l.message}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="con-sub">Showing recent output. Live streaming and full history arrive with the platform backend.</p>
    </div>
  );
}
