"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Fact, FactGrid, Page, PageHeader, Panel, PanelTitle, Skeleton } from "../../components/console/kit";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { companiesApi } from "../../lib/hnsApi";
import { formatDate } from "../../lib/format";
import { useSession } from "../../lib/session";
import type { CompanyDetail } from "../../lib/types";

export default function SettingsPage() {
  const { activeCompanyId, user, reload } = useSession();
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
    <Page>
      <PageHeader title="Settings" subtitle="Your account and this company." />

      {error && <Alert>{error}</Alert>}

      <Panel padded>
        <PanelTitle>Account</PanelTitle>
        <FactGrid flush>
          <Fact flush k="Name" v={user?.name || "—"} />
          <Fact flush k="Email" v={user?.email} />
        </FactGrid>
      </Panel>

      <Panel padded>
        <PanelTitle>Company</PanelTitle>
        {!company ? (
          <Skeleton className="mt-3 h-20" aria-hidden="true" />
        ) : (
          <>
            <FactGrid flush>
              <Fact flush k="Members" v={company.memberCount} mono />
              <Fact flush k="Apps" v={company.projectCount} mono />
              <Fact flush k="Created" v={formatDate(company.createdAt)} />
            </FactGrid>
            <form className="mt-4 flex flex-wrap gap-2.5" onSubmit={rename}>
              <Input className="min-w-[220px] flex-1" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
              <Button type="submit" disabled={savingName || !name.trim() || name.trim() === company.name}>{savingName ? "Saving…" : "Rename"}</Button>
            </form>
            {notice && <Alert variant="info" className="mt-3">{notice}</Alert>}
          </>
        )}
      </Panel>

      {company && (
        <Panel padded tone="danger">
          <PanelTitle tone="danger">Danger zone</PanelTitle>
          <p className="mt-1 text-[0.92rem] text-muted-foreground">
            Deleting <b className="text-foreground">{company.name}</b> can’t be undone. It’s blocked while the company still has any
            apps — delete or transfer them first.
          </p>
          {delErr && <Alert className="mt-3">{delErr}</Alert>}
          <div className="mt-3.5 flex flex-wrap gap-2.5">
            <Input className="min-w-[220px] flex-1" placeholder={`Type “${company.name}” to confirm`} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <Button variant="destructive" disabled={deleting || confirm !== company.name} onClick={del}>{deleting ? "Deleting…" : "Delete company"}</Button>
          </div>
        </Panel>
      )}
    </Page>
  );
}
