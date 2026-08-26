"use client";

import { USER, WORKSPACE } from "../../lib/dummy";

export default function SettingsPage() {
  return (
    <div className="con-page">
      <div className="con-head">
        <div>
          <h1 className="con-h1">Settings</h1>
          <p className="con-sub">Your account and workspace.</p>
        </div>
      </div>

      <section className="panel pad">
        <h2 className="panel-t">Account</h2>
        <div className="detail-facts flush">
          <div className="fact"><div className="fact-k">Name</div><div className="fact-v">{USER.name}</div></div>
          <div className="fact"><div className="fact-k">Email</div><div className="fact-v">{USER.email}</div></div>
        </div>
      </section>

      <section className="panel pad">
        <h2 className="panel-t">Workspace</h2>
        <div className="detail-facts flush">
          <div className="fact"><div className="fact-k">Name</div><div className="fact-v">{WORKSPACE.name}</div></div>
          <div className="fact"><div className="fact-k">Slug</div><div className="fact-v mono">{WORKSPACE.slug}</div></div>
          <div className="fact"><div className="fact-k">Plan</div><div className="fact-v">Early access</div></div>
        </div>
        <p className="con-sub" style={{ marginTop: "1rem" }}>Teams and roles are coming after the MVP — this workspace is yours for now.</p>
      </section>
    </div>
  );
}
