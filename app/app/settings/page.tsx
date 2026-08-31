"use client";

import { useCallback, useEffect, useState } from "react";
import { companiesApi } from "../../lib/hnsApi";
import { formatDate, ROLE_LABEL } from "../../lib/format";
import { atLeast, useSession } from "../../lib/session";
import type { CompanyDetail } from "../../lib/types";

export default function SettingsPage() {
  const { activeCompanyId, user, role, reload } = useSession();
  const isAdmin = atLeast(role, "company_admin");
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setCompany(null);
    setError(null);
    try {
      const data = await companiesApi.get(activeCompanyId);
      setCompany(data);
      setName(data.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load company settings.");
    }
  }, [activeCompanyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    setSavingName(true);
    setNotice(null);
    setError(null);
    try {
      await companiesApi.rename(activeCompanyId, name.trim());
      setNotice("Company name updated.");
      await Promise.all([load(), reload()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t rename the company.");
    } finally {
      setSavingName(false);
    }
  }

  async function del() {
    if (!activeCompanyId) return;
    setDeleting(true);
    setDelErr(null);
    try {
      await companiesApi.remove(activeCompanyId);
      await reload();
      window.location.href = "/app";
    } catch (e) {
      setDelErr(e instanceof Error ? e.message : "Couldn’t delete the company.");
      setDeleting(false);
    }
  }

  return (
    <div className="con-page">
      <div className="con-head">
        <div>
          <h1 className="con-h1">Settings</h1>
          <p className="con-sub">Your account and this company.</p>
        </div>
      </div>

      {error && <div className="con-alert err">{error}</div>}

      <section className="panel pad">
        <h2 className="panel-t">Account</h2>
        <div className="detail-facts flush">
          <div className="fact"><div className="fact-k">Name</div><div className="fact-v">{user?.name || "—"}</div></div>
          <div className="fact"><div className="fact-k">Email</div><div className="fact-v">{user?.email}</div></div>
          <div className="fact"><div className="fact-k">Your role</div><div className="fact-v">{role ? ROLE_LABEL[role] : "—"}</div></div>
        </div>
      </section>

      <section className="panel pad">
        <h2 className="panel-t">Company</h2>
        {!company ? (
          <div className="skeleton" style={{ height: 80, marginTop: 12 }} aria-hidden="true" />
        ) : (
          <>
            <div className="detail-facts flush">
              <div className="fact"><div className="fact-k">Members</div><div className="fact-v mono">{company.memberCount}</div></div>
              <div className="fact"><div className="fact-k">Projects</div><div className="fact-v mono">{company.projectCount}</div></div>
              <div className="fact"><div className="fact-k">Created</div><div className="fact-v">{formatDate(company.createdAt)}</div></div>
            </div>
            {isAdmin ? (
              <form className="token-create" style={{ marginTop: 16 }} onSubmit={rename}>
                <input className="con-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
                <button className="con-btn" type="submit" disabled={savingName || !name.trim() || name.trim() === company.name}>{savingName ? "Saving…" : "Rename"}</button>
              </form>
            ) : (
              <p className="con-sub" style={{ marginTop: 12 }}>Company name: <b>{company.name}</b></p>
            )}
            {notice && <div className="con-alert info" style={{ marginTop: 12 }}>{notice}</div>}
          </>
        )}
      </section>

      {isAdmin && company && (
        <section className="panel pad danger">
          <h2 className="panel-t">Danger zone</h2>
          <p className="con-sub" style={{ marginTop: 4 }}>
            Deleting <b>{company.name}</b> can’t be undone. It’s blocked while the company still has any
            projects — delete or transfer them first.
          </p>
          {delErr && <div className="con-alert err" style={{ marginTop: 12 }}>{delErr}</div>}
          <div className="danger-row">
            <input className="con-input" placeholder={`Type “${company.name}” to confirm`} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <button className="con-btn danger" disabled={deleting || confirm !== company.name} onClick={del}>{deleting ? "Deleting…" : "Delete company"}</button>
          </div>
        </section>
      )}
    </div>
  );
}
