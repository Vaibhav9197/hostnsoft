"use client";

import { use, useCallback, useEffect, useState } from "react";
import { StatusPill } from "../../../../components/console/StatusPill";
import { Alert, EmptyState, Fact, FactGrid, Page, PageHeader, Panel, PanelTitle, Skeleton } from "../../../../components/console/kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table";
import { deploymentsApi } from "../../../../lib/hnsApi";
import { relativeTime } from "../../../../lib/format";
import { useSession } from "../../../../lib/session";
import { cn } from "../../../../lib/utils";
import type { Deployment } from "../../../../lib/types";

export default function DeploymentsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { activeCompanyId } = useSession();
  const [deps, setDeps] = useState<Deployment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setDeps(null);
    setError(null);
    try {
      setDeps(await deploymentsApi.list(activeCompanyId, projectId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load deployments.");
    }
  }, [activeCompanyId, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <Page><Alert>{error}</Alert></Page>;
  if (!deps) return <Page><Skeleton className="h-[200px]" aria-hidden="true" /></Page>;

  const active = deps.find((d) => d.id === selected) ?? null;

  return (
    <Page>
      <PageHeader title="Deployments" subtitle="Every deploy attempt, newest first." />

      {deps.length === 0 && (
        <EmptyState title="No deployments yet">
          Deploys triggered by <code className="border border-border bg-elevated px-1 py-0.5 font-mono text-[0.85em] text-foreground">embarko-deploy</code> show up here.
        </EmptyState>
      )}

      {deps.length > 0 && (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deploy</TableHead><TableHead>Status</TableHead><TableHead>App version</TableHead>
                <TableHead>Memory</TableHead><TableHead>By</TableHead><TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deps.map((d) => (
                <TableRow
                  key={d.version}
                  className={cn("cursor-pointer", active?.id === d.id && "bg-primary/10 shadow-[inset_3px_0_0_var(--accent)]")}
                  onClick={() => setSelected(active?.id === d.id ? null : d.id)}
                >
                  <TableCell className="font-mono">{d.version}</TableCell>
                  <TableCell><StatusPill status={d.status} /></TableCell>
                  <TableCell className="font-mono text-[0.78rem] text-faint">{d.appVersion}</TableCell>
                  <TableCell className="font-mono text-[0.78rem] text-faint">{d.memoryMb != null ? `${d.memoryMb} MB` : "—"}</TableCell>
                  <TableCell>{d.triggeredBy ?? "—"}</TableCell>
                  <TableCell className="font-mono text-[0.78rem] text-faint">{relativeTime(d.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}

      {active && (
        <Panel padded>
          <div className="mb-3 flex items-center gap-2.5">
            <PanelTitle>Deploy {active.version}</PanelTitle>
            <StatusPill status={active.status} />
          </div>
          {active.errorDetail && <Alert className="mb-3">{active.errorDetail}</Alert>}
          <FactGrid flush>
            <Fact flush k="App version" v={active.appVersion} mono />
            <Fact flush k="Image tag" v={active.imageTag ?? "—"} mono />
            <Fact flush k="Memory" v={active.memoryMb != null ? `${active.memoryMb} MB` : "—"} mono />
            <Fact flush k="Triggered by" v={active.triggeredBy ?? "—"} />
            <Fact flush k="Started" v={relativeTime(active.createdAt)} />
            <Fact flush k="Finished" v={active.finishedAt ? relativeTime(active.finishedAt) : "—"} />
          </FactGrid>
        </Panel>
      )}
    </Page>
  );
}
