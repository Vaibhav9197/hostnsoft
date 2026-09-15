"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { ConfirmDialog, type ConfirmRequest } from "../../components/console/ConfirmDialog";
import { Alert, LinkButton, Page, PageHeader, Panel, Skeleton, Tag } from "../../components/console/kit";
import { COPIED_LABEL, CopyPromptButton } from "../../components/CopyPromptButton";
import { Button, buttonVariants } from "../../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { consoleDeployPromptWithToken } from "../../lib/deployPrompt";
import { tokensApi } from "../../lib/hnsApi";
import { formatDate, relativeTime } from "../../lib/format";
import { useSession } from "../../lib/session";
import { randomTokenName } from "../../lib/tokenName";
import { cn } from "../../lib/utils";
import type { DeployToken, DeployTokenSecret } from "../../lib/types";


export default function TokensPage() {
  const { activeCompanyId } = useSession();
  const [tokens, setTokens] = useState<DeployToken[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState<DeployTokenSecret | null>(null);
  /* Whether the secret on screen has reached the clipboard at least once. The
     banner can only be dismissed after that: it is the one and only showing of
     the token, and a stray click on a close button should not be able to lose
     it. */
  const [secretCopied, setSecretCopied] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

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

  async function createToken() {
    if (!activeCompanyId) return;
    setCreating(true);
    setError(null);
    try {
      const created = await tokensApi.create(activeCompanyId, randomTokenName((tokens ?? []).map((t) => t.label)));
      setSecret(created);
      setSecretCopied(false);
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
      setSecretCopied(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t rotate the token.");
    }
  }

  /**
   * Revoking is instant and permanent — every deploy using this token starts
   * failing and there's no way back. Say so, and point at Rotate, which is what
   * most people reaching for this actually want.
   */
  function askRevoke(t: DeployToken) {
    setConfirm({
      title: `Revoke “${t.label}”?`,
      body: (
        <>
          Any deploy still using <b>{t.tokenPrefix}…</b> starts failing immediately, and the token can&rsquo;t be
          brought back. If you only want a fresh secret, <b>Rotate</b> instead — the old token keeps working for an
          hour while you roll it out.
        </>
      ),
      cta: "Revoke token",
      destructive: true,
      dismiss: "Keep it",
      onConfirm: () => revoke(t.id),
    });
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

  return (
    <Page>
      <PageHeader
        title="Deploy tokens"
        /* Written for the person who arrived asking "where do I get a token?".
           The old line named the skill that consumes it, which answers a
           different question — one nobody on this page has. */
        subtitle="This is where you make a token. Create one below, copy it, and give it to your AI agent — that’s what lets it deploy your apps."
      />

      {/* One button, no form: the token is named for the owner, so there is
          nothing to fill in before the only action on the page works. */}
      <div>
        <Button onClick={createToken} disabled={creating}>
          <Plus aria-hidden="true" />
          {creating ? "Creating…" : "Create token"}
        </Button>
      </div>

      {error && <Alert>{error}</Alert>}

      {secret && (
        <div className="rounded-xl border border-primary/30 bg-primary/10">
          <div className="border-b border-primary/30 px-4 py-3">
            <p className="text-[0.86rem] font-bold text-foreground">Your token is ready — it won’t be shown again.</p>
            <p className="mt-0.5 text-[0.86rem] text-muted-foreground">
              Copy the prompt below and paste it into your AI agent. The token is already inside it, so there is nothing else to set up.
            </p>
          </div>

          {/* The prompt is the primary action and the raw token the secondary
              one: the prompt is what the owner actually needs to paste, and it
              carries the token with it. The bare token is for someone who
              already has a prompt in flight and just needs the credential. */}
          <div className="flex flex-wrap items-center gap-2.5 px-4 pt-4">
            <CopyPromptButton
              text={consoleDeployPromptWithToken(secret.token)}
              className={buttonVariants()}
              copiedChildren={COPIED_LABEL}
              onCopied={() => setSecretCopied(true)}
            >
              Copy prompt with token
            </CopyPromptButton>
            <CopyPromptButton
              text={secret.token}
              className={buttonVariants({ variant: "outline" })}
              copiedChildren="Copied"
              onCopied={() => setSecretCopied(true)}
            >
              Copy token only
            </CopyPromptButton>
            {/* Appears only once something has been copied — closing the banner
                before that would lose the token for good. */}
            {secretCopied && (
              <Button variant="ghost" className="ml-auto" onClick={() => setSecret(null)}>
                Done
              </Button>
            )}
          </div>

          <code className="block break-all px-4 pb-4 pt-3 font-mono text-[0.8rem] text-muted-foreground">{secret.token}</code>

          {secret.oldTokenValidUntil && (
            <div className="border-t border-primary/30 px-4 py-3 text-[0.82rem] text-muted-foreground">
              Your previous token keeps working until {new Date(secret.oldTokenValidUntil).toLocaleString()}, so nothing breaks while you switch.
            </div>
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
                          <LinkButton danger className="ml-3.5" onClick={() => askRevoke(t)}>Revoke</LinkButton>
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

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </Page>
  );
}
