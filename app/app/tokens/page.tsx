"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Alert, LinkButton, Page, PageHeader, Panel, Skeleton, Tag } from "../../components/console/kit";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { tokensApi } from "../../lib/hnsApi";
import { formatDate, relativeTime } from "../../lib/format";
import { atLeast, useSession } from "../../lib/session";
import { cn } from "../../lib/utils";
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
      <Page>
        <PageHeader title="Deploy tokens" />
        <div className="border border-dashed border-input bg-card px-6 py-12 text-center">
          <h3 className="text-[1.1rem] font-bold text-foreground">Company admins only</h3>
          <p className="mx-auto mt-1.5 max-w-[42ch] text-[0.92rem] text-muted-foreground">Deploy tokens are managed by company admins. Ask one to create a token for your CI pipeline.</p>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Deploy tokens"
        subtitle={
          <>Credentials <code className="border border-border bg-elevated px-1 py-0.5 font-mono text-[0.85em] text-foreground">embarko-deploy</code> checks on every deploy. Not used to sign in here.</>
        }
      />

      <form className="flex flex-wrap gap-2.5" onSubmit={createToken}>
        <Input className="min-w-[220px] flex-1" placeholder="Label — e.g. CI pipeline" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} />
        <Button type="submit" disabled={creating || !label.trim()}>{creating ? "Creating…" : "Create token"}</Button>
      </form>

      {error && <Alert>{error}</Alert>}

      {secret && (
        <div className="border border-primary/30 bg-primary/10">
          <div className="flex items-center justify-between border-b border-primary/30 px-4 py-3">
            <span className="text-[0.86rem] font-bold text-foreground">Copy your token now — it won’t be shown again.</span>
            <button className="grid place-items-center text-muted-foreground hover:text-foreground" onClick={() => setSecret(null)} aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-3 p-4">
            <code className="flex-1 break-all font-mono text-[0.88rem] text-foreground">{secret.token}</code>
            <Button variant="outline" size="sm" onClick={copySecret}>{copied ? "Copied" : "Copy"}</Button>
          </div>
          {secret.oldTokenValidUntil && (
            <div className="px-4 pb-3.5 font-mono text-[0.78rem] text-faint">The previous token keeps working until {new Date(secret.oldTokenValidUntil).toLocaleString()}.</div>
          )}
        </div>
      )}

      {!tokens && !error && <Skeleton className="h-[120px]" aria-hidden="true" />}

      {tokens && tokens.length === 0 && (
        <div className="border border-dashed border-input bg-card px-6 py-12 text-center">
          <h3 className="text-[1.1rem] font-bold text-foreground">No tokens</h3>
          <p className="mx-auto mt-1.5 max-w-[42ch] text-[0.92rem] text-muted-foreground">Create one above to let a CI pipeline deploy.</p>
        </div>
      )}

      {tokens && tokens.length > 0 && (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Label</TableHead><TableHead>Token</TableHead><TableHead>Last used</TableHead><TableHead>Created</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((t) => {
                const revoked = t.revokedAt != null && new Date(t.revokedAt).getTime() <= Date.now();
                const rotating = t.revokedAt != null && !revoked;
                return (
                  <TableRow key={t.id} className={cn(revoked && "opacity-50")}>
                    <TableCell>{t.label}</TableCell>
                    <TableCell className="font-mono">
                      {t.tokenPrefix}…
                      {rotating && <Tag tone="warn">rotating · valid until {new Date(t.revokedAt!).toLocaleTimeString()}</Tag>}
                    </TableCell>
                    <TableCell className="font-mono text-[0.78rem] text-faint">{relativeTime(t.lastUsedAt)}</TableCell>
                    <TableCell className="font-mono text-[0.78rem] text-faint">{formatDate(t.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {!revoked && (
                        <>
                          <LinkButton onClick={() => rotate(t.id)}>Rotate</LinkButton>
                          <LinkButton danger className="ml-3.5" onClick={() => revoke(t.id)}>Revoke</LinkButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Panel>
      )}

      <p className="text-[0.92rem] text-muted-foreground"><b className="text-foreground">Rotate</b> for routine hygiene — the old token keeps working for an hour. <b className="text-foreground">Revoke</b> immediately if a token leaked.</p>
    </Page>
  );
}
