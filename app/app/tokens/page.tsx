"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Plus } from "lucide-react";
import { ConfirmDialog, type ConfirmRequest } from "../../components/console/ConfirmDialog";
import { Alert, LinkButton, Page, PageHeader, Panel, Skeleton, Tag } from "../../components/console/kit";
import { COPIED_LABEL, CopyPromptButton, PromptIcon } from "../../components/CopyPromptButton";
import { Button, buttonVariants } from "../../components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { consoleDeployPromptWithToken } from "../../lib/deployPrompt";
import { tokensApi } from "../../lib/hnsApi";
import { formatDate, relativeTime } from "../../lib/format";
import { useSession } from "../../lib/session";
import { randomTokenName } from "../../lib/tokenName";
import type { DeployToken, DeployTokenKind, DeployTokenSecret } from "../../lib/types";

/* The two kinds of token, in the words the person would use for the
   question they're actually answering: "who is this for?". The API's names
   (user / workspace) say what the token can reach, which is the consequence,
   not the choice. "Just me" comes first and is preselected: almost every
   token made here goes into the creator's own AI agent. */
const KIND_CHOICES: { kind: DeployTokenKind; title: string; body: string }[] = [
  {
    kind: "user",
    title: "Just me",
    body: "Works on every app you can reach, in any of your workspaces. Stops working wherever you lose access.",
  },
  {
    kind: "workspace",
    title: "Whole workspace",
    body: "Works only on this workspace’s apps, and keeps working if you leave. Good for shared machines and automated deploys.",
  },
];


export default function TokensPage() {
  const { activeCompanyId, user } = useSession();
  const [tokens, setTokens] = useState<DeployToken[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  /* The name dialog. It opens pre-filled with a suggested name, so accepting
     it is still one click — typing is only for someone who wants their own. */
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<DeployTokenKind>("user");
  const [secret, setSecret] = useState<DeployTokenSecret | null>(null);
  /* Whether the secret on screen has reached the clipboard at least once. The
     banner can only be dismissed after that: it is the one and only showing of
     the token, and a stray click on a close button should not be able to lose
     it. */
  const [secretCopied, setSecretCopied] = useState(false);
  const [showRevoked, setShowRevoked] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  /* A token mid-rotation has a revokedAt in the future — it still works, so it
     belongs with the live ones, carrying its "rotating" tag. Only a date that
     has already passed means the token is dead. */
  const live = (tokens ?? []).filter((t) => t.revokedAt == null || new Date(t.revokedAt).getTime() > Date.now());
  const dead = (tokens ?? []).filter((t) => t.revokedAt != null && new Date(t.revokedAt).getTime() <= Date.now());

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

  function openNaming() {
    setName(randomTokenName((tokens ?? []).map((t) => t.label)));
    setKind("user");
    setNaming(true);
  }

  async function createToken(e: React.FormEvent) {
    e.preventDefault();
    const label = name.trim();
    if (!activeCompanyId || !label) return;
    setCreating(true);
    setError(null);
    try {
      const created = await tokensApi.create(activeCompanyId, label, kind);
      setNaming(false);
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

      <div>
        <Button onClick={openNaming} disabled={creating}>
          <Plus aria-hidden="true" />
          Create token
        </Button>
      </div>

      <Dialog open={naming} onOpenChange={(open) => !creating && setNaming(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name your token</DialogTitle>
            <DialogDescription>
              Pick something that tells you where it’s used, like the AI agent or machine it’s for.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createToken} className="grid gap-5">
            {/* The page's own alert sits behind the dialog, so a failed create
                has to say so here. */}
            {error && <div className="text-sm font-medium text-destructive">{error}</div>}
            <fieldset className="grid gap-2" disabled={creating}>
              <legend className="mb-2 text-sm font-semibold text-foreground">Who is it for?</legend>
              {KIND_CHOICES.map((c) => (
                <label
                  key={c.kind}
                  className={`flex cursor-pointer gap-3 rounded-lg border px-3.5 py-3 transition-colors ${
                    kind === c.kind ? "border-primary bg-primary/5" : "border-input hover:border-foreground/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="token-kind"
                    value={c.kind}
                    checked={kind === c.kind}
                    onChange={() => setKind(c.kind)}
                    className="mt-1 accent-[var(--primary)]"
                  />
                  <span>
                    <span className="block text-[0.9rem] font-semibold text-foreground">{c.title}</span>
                    <span className="block text-[0.84rem] text-muted-foreground">{c.body}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="grid gap-1.5">
              <label htmlFor="token-name" className="text-sm font-semibold text-foreground">
                Token name
              </label>
              <Input
                id="token-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                onFocus={(e) => e.currentTarget.select()}
                disabled={creating}
              />
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" disabled={creating} />}>Cancel</DialogClose>
              <Button type="submit" disabled={creating || !name.trim()}>
                {creating ? "Creating…" : "Create token"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {error && <Alert>{error}</Alert>}

      {secret && (
        <div className="rounded-xl border border-primary/30 bg-card">
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
              <PromptIcon aria-hidden="true" />
              Copy prompt with token
            </CopyPromptButton>
            <CopyPromptButton
              text={secret.token}
              className={buttonVariants({ variant: "outline" })}
              copiedChildren="Copied"
              onCopied={() => setSecretCopied(true)}
            >
              <Copy aria-hidden="true" />
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

      {tokens && live.length === 0 && (
        <div className="border border-dashed border-input bg-card px-6 py-12 text-center">
          <h3 className="text-[1.1rem] font-bold text-foreground">No tokens</h3>
          <p className="mx-auto mt-1.5 max-w-[42ch] text-[0.92rem] text-muted-foreground">Create one above and hand it to your AI agent.</p>
        </div>
      )}

      {live.length > 0 && (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Label</TableHead><TableHead>For</TableHead><TableHead>Token</TableHead><TableHead>Last used</TableHead><TableHead>Created</TableHead><TableHead /></TableRow>
            </TableHeader>
            <TableBody>
              {live.map((t) => {
                const rotating = t.revokedAt != null;
                return (
                  <TableRow key={t.id}>
                    <TableCell>{t.label}</TableCell>
                    <TableCell className="whitespace-nowrap text-[0.84rem] text-muted-foreground">{kindLabel(t, user?.id)}</TableCell>
                    <TableCell className="font-mono">
                      {t.tokenPrefix}…
                      {rotating && <Tag tone="warn">rotating · valid until {new Date(t.revokedAt!).toLocaleTimeString()}</Tag>}
                    </TableCell>
                    <TableCell className="font-mono text-[0.78rem] text-faint">{relativeTime(t.lastUsedAt)}</TableCell>
                    <TableCell className="font-mono text-[0.78rem] text-faint">{formatDate(t.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <LinkButton onClick={() => rotate(t.id)}>Rotate</LinkButton>
                      <LinkButton danger className="ml-3.5" onClick={() => askRevoke(t)}>Revoke</LinkButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Panel>
      )}

      {/* Dead tokens are history, not inventory: nothing can be done to them
          and they push the working ones down the page. Kept behind a link so
          the record is still there for anyone checking what they revoked. */}
      {dead.length > 0 && (
        <div>
          <LinkButton onClick={() => setShowRevoked((v) => !v)} aria-expanded={showRevoked}>
            {showRevoked ? "Hide revoked tokens" : `Revoked tokens (${dead.length})`}
          </LinkButton>

          {showRevoked && (
            <Panel className="mt-3">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Label</TableHead><TableHead>Token</TableHead><TableHead>Last used</TableHead><TableHead>Created</TableHead><TableHead>Revoked</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {dead.map((t) => (
                    <TableRow key={t.id} className="opacity-60">
                      <TableCell>{t.label}</TableCell>
                      <TableCell className="font-mono">{t.tokenPrefix}…</TableCell>
                      <TableCell className="font-mono text-[0.78rem] text-faint">{relativeTime(t.lastUsedAt)}</TableCell>
                      <TableCell className="font-mono text-[0.78rem] text-faint">{formatDate(t.createdAt)}</TableCell>
                      <TableCell className="font-mono text-[0.78rem] text-faint">{formatDate(t.revokedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Panel>
          )}
        </div>
      )}

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </Page>
  );
}

/* Whose a token is, for the list. Everyone in the workspace sees every token
   here, so a personal token that isn't yours says so — it reaches that
   person's other workspaces too, which is worth knowing before revoking or
   keeping it. */
function kindLabel(t: DeployToken, myId: string | undefined): string {
  if (t.kind === "workspace") return "Whole workspace";
  return t.createdBy === myId ? "Just me" : "A teammate";
}
