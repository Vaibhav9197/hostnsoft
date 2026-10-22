"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Fact, FactGrid, Page, PageHeader, Panel, PanelTitle, Skeleton } from "../../components/console/kit";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { companiesApi } from "../../lib/hnsApi";
import { formatDate } from "../../lib/format";
import { usePermissions } from "../../lib/permissions";
import { useSession } from "../../lib/session";
import type { CompanyDetail } from "../../lib/types";

export default function SettingsPage() {
  const { activeCompanyId, user, reload } = useSession();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const { can, data: perms } = usePermissions();
  // Renaming is workspace.manage (Owner, Admin); everyone else reads the name.
  const canRename = can("workspace.manage");
  // The count is every app in the workspace. Everyone but Billing can see
  // every app (a Member at least "Can use"), so only Billing would see a
  // number that doesn't match anything they can open.
  const seesAllApps = !perms || perms.role !== "billing";

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setCompany(null);
    setError(null);
    try {
      const data = await companiesApi.get(activeCompanyId);
      setCompany(data);
      setName(data.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load workspace settings.");
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
      setNotice("Workspace name updated.");
      await Promise.all([load(), reload()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t rename the workspace.");
    } finally {
      setSavingName(false);
    }
  }

  return (
    <Page>
      <PageHeader title="Settings" subtitle="Your account and this workspace." />

      {error && <Alert>{error}</Alert>}

      <Panel padded>
        <PanelTitle>Account</PanelTitle>
        <FactGrid flush>
          <Fact flush k="Name" v={user?.name || "—"} />
          <Fact flush k="Email" v={user?.email} />
        </FactGrid>
      </Panel>

      <Panel padded>
        <PanelTitle>Workspace</PanelTitle>
        {!company ? (
          <Skeleton className="mt-3 h-20" aria-hidden="true" />
        ) : (
          <>
            <p className="mt-1 text-[0.92rem] text-muted-foreground">
              {seesAllApps && (company.projectCount === 1 ? "1 app" : `${company.projectCount} apps`)}
              {seesAllApps && company.createdAt && " · "}
              {company.createdAt && <>Created {formatDate(company.createdAt)}</>}
            </p>
            {!canRename ? (
              <FactGrid flush>
                <Fact flush k="Workspace name" v={company.name} />
              </FactGrid>
            ) : (
            <form className="mt-4 grid gap-1.5" onSubmit={rename}>
              <label htmlFor="ws-name" className="text-sm font-semibold text-foreground">Workspace name</label>
              <div className="flex flex-wrap gap-2.5">
                <Input id="ws-name" className="min-w-[220px] flex-1" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
                <Button type="submit" disabled={savingName || !name.trim() || name.trim() === company.name}>{savingName ? "Saving…" : "Rename"}</Button>
              </div>
            </form>
            )}
            {notice && <Alert variant="info" className="mt-3">{notice}</Alert>}
          </>
        )}
      </Panel>
    </Page>
  );
}
