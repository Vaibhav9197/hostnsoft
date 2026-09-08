"use client";

import { use, useCallback, useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Alert, EmptyState, LinkButton, Page, PageHeader, Panel, Skeleton } from "../../../../components/console/kit";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table";
import { envVarsApi } from "../../../../lib/hnsApi";
import { relativeTime } from "../../../../lib/format";
import { useSession } from "../../../../lib/session";
import type { EnvVar } from "../../../../lib/types";

export default function EnvironmentPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { activeCompanyId } = useSession();
  const [vars, setVars] = useState<EnvVar[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setVars(null);
    setError(null);
    try {
      setVars(await envVarsApi.list(activeCompanyId, projectId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load variables.");
    }
  }, [activeCompanyId, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function upsert(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      // Bulk-upsert endpoint; we send a single pair. Existing keys omitted are left as-is.
      await envVarsApi.set(activeCompanyId, projectId, [{ key: key.trim(), value }]);
      setNotice(`${key.trim()} saved. Applies on the next deploy.`);
      setKey("");
      setValue("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save the variable.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(k: string) {
    if (!activeCompanyId) return;
    const prev = vars;
    setVars((v) => (v ?? []).filter((x) => x.key !== k));
    try {
      await envVarsApi.remove(activeCompanyId, projectId, k);
    } catch (e) {
      setVars(prev ?? null);
      setError(e instanceof Error ? e.message : "Couldn’t remove the variable.");
    }
  }

  return (
    <Page>
      <PageHeader title="Environment" subtitle="Config and secrets stored for this app." />

      <form className="flex flex-wrap items-center gap-2.5" onSubmit={upsert}>
        <Input className="min-w-[140px] flex-1 font-mono" placeholder="KEY" value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} />
        <Input className="min-w-[140px] flex-1 font-mono" placeholder="value" value={value} onChange={(e) => setValue(e.target.value)} />
        <Button type="submit" disabled={busy || !key.trim() || !value}>Save</Button>
      </form>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert variant="info">{notice}</Alert>}

      {!vars && !error && <Skeleton className="h-[140px]" aria-hidden="true" />}

      {vars && vars.length === 0 && (
        <EmptyState title="No variables">Add config and secrets above.</EmptyState>
      )}

      {vars && vars.length > 0 && (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Key</TableHead><TableHead>Value</TableHead><TableHead>Updated</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {vars.map((v) => (
                <TableRow key={v.key}>
                  <TableCell className="font-mono">{v.key}</TableCell>
                  <TableCell className="max-w-[340px] font-mono">
                    {!revealed[v.key] ? (
                      <span className="inline-flex items-center gap-2 text-faint">
                        <Lock className="size-[13px]" />
                        ••••••••
                        <LinkButton onClick={() => setRevealed((r) => ({ ...r, [v.key]: true }))}>reveal</LinkButton>
                      </span>
                    ) : (
                      <span className="inline-flex items-center break-all">
                        {v.value}
                        <LinkButton className="ml-2.5" onClick={() => setRevealed((r) => ({ ...r, [v.key]: false }))}>hide</LinkButton>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-[0.78rem] text-faint">{relativeTime(v.updatedAt)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <LinkButton danger onClick={() => remove(v.key)}>Remove</LinkButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}

      <p className="text-[0.92rem] text-muted-foreground">Saved changes are stored here but <b className="text-foreground">don’t reach the running app yet</b> — there’s no redeploy trigger, so they apply on the next deploy.</p>
    </Page>
  );
}
