"use client";

import { use, useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { Alert, EmptyState, LinkButton, Page, PageHeader, Panel, Skeleton } from "../../../../components/console/kit";
import { StatusPill } from "../../../../components/console/StatusPill";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { domainsApi } from "../../../../lib/hnsApi";
import { useSession } from "../../../../lib/session";
import type { Domain, DomainInstructions } from "../../../../lib/types";

export default function DomainPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { activeCompanyId } = useSession();

  const [domains, setDomains] = useState<Domain[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  // Keyed by domain so several rows can be verified without blocking each other.
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setDomains(null);
    setError(null);
    try {
      setDomains(await domainsApi.list(activeCompanyId, projectId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load domains.");
    }
  }, [activeCompanyId, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  // Replace one row in place, so a verify result doesn't cost a full reload.
  function merge(next: Domain) {
    setDomains((list) => (list ?? []).map((d) => (d.domain === next.domain ? { ...d, ...next } : d)));
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    const domain = normalizeDomain(input);
    if (!domain) return;
    setAdding(true);
    setError(null);
    try {
      const created = await domainsApi.register(activeCompanyId, projectId, domain);
      // The register response carries the DNS record, so show it straight away
      // rather than re-listing and losing the instructions.
      setDomains((list) => [...(list ?? []).filter((d) => d.domain !== created.domain), created]);
      setInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t add that domain.");
    } finally {
      setAdding(false);
    }
  }

  async function verify(domain: string) {
    if (!activeCompanyId) return;
    setVerifying((v) => ({ ...v, [domain]: true }));
    setError(null);
    try {
      // Resolves for both outcomes — active, or "not ready yet" with the record
      // to retry against. Only a real failure throws.
      merge(await domainsApi.verify(activeCompanyId, projectId, domain));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t check DNS for that domain.");
    } finally {
      setVerifying((v) => ({ ...v, [domain]: false }));
    }
  }

  async function remove(domain: string) {
    if (!activeCompanyId) return;
    const prev = domains;
    setDomains((list) => (list ?? []).filter((d) => d.domain !== domain));
    try {
      await domainsApi.remove(activeCompanyId, projectId, domain);
    } catch (e) {
      setDomains(prev ?? null);
      setError(e instanceof Error ? e.message : "Couldn’t remove that domain.");
    }
  }

  return (
    <Page>
      <PageHeader title="Domain" subtitle="Serve this project on a domain you own." />

      <div className="flex flex-col gap-2">
        <form className="flex flex-wrap items-center gap-2.5" onSubmit={add}>
          <Input
            className="min-w-[240px] flex-1 font-mono"
            placeholder="app.acme.com  or  acme.com"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <Button type="submit" disabled={adding || !normalizeDomain(input)}>
            {adding ? "Adding…" : "Add domain"}
          </Button>
        </form>
        {/* The placeholder alone reads as "subdomains only". Say outright that
            a root domain is equally fine, and that the difference only changes
            which record we hand back. */}
        <p className="text-[0.85rem] text-muted-foreground">
          Both work — a subdomain like <Ex>app.acme.com</Ex>, or the root domain <Ex>acme.com</Ex>. We’ll show you
          the right record for whichever you enter: a CNAME for a subdomain, an A record for a root domain.
        </p>
      </div>

      {error && <Alert>{error}</Alert>}

      {!domains && !error && <Skeleton className="h-[140px]" aria-hidden="true" />}

      {domains && domains.length === 0 && (
        <EmptyState title="No custom domain yet">
          Add one above and we’ll show you the single DNS record to create at your registrar.
        </EmptyState>
      )}

      {domains?.map((d) => (
        <DomainCard
          key={d.domain}
          domain={d}
          verifying={!!verifying[d.domain]}
          onVerify={() => verify(d.domain)}
          onRemove={() => remove(d.domain)}
        />
      ))}

      <p className="text-[0.92rem] text-muted-foreground">
        DNS changes can take anywhere from a few minutes to a few hours to reach us. Verifying is just a live
        lookup — nothing is rebuilt or redeployed, and it’s safe to press as often as you like.
      </p>
    </Page>
  );
}

function Ex({ children }: { children: React.ReactNode }) {
  return (
    <code className="border border-border bg-elevated px-1 py-0.5 font-mono text-[0.9em] text-foreground">{children}</code>
  );
}

function DomainCard({
  domain,
  verifying,
  onVerify,
  onRemove,
}: {
  domain: Domain;
  verifying: boolean;
  onVerify: () => void;
  onRemove: () => void;
}) {
  const live = domain.status === "active";

  return (
    <Panel padded className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="truncate font-mono text-[0.95rem] font-semibold text-foreground">{domain.domain}</span>
          <StatusPill status={domain.status} />
        </div>
        <LinkButton danger onClick={onRemove}>
          Remove
        </LinkButton>
      </div>

      {live ? (
        <a
          href={`https://${domain.domain}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-1 text-[0.9rem] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          https://{domain.domain}
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </a>
      ) : (
        <>
          {domain.error && <Alert variant="warn">{domain.error}</Alert>}

          {domain.instructions && <DnsRecord record={domain.instructions} />}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={onVerify} disabled={verifying}>
              {verifying ? "Checking DNS…" : "Verify"}
            </Button>
            <span className="text-[0.85rem] text-muted-foreground">
              {domain.status === "failed"
                ? "Not there yet — check again once the record has propagated."
                : "Press once the record is saved at your DNS provider."}
            </span>
          </div>
        </>
      )}
    </Panel>
  );
}

/**
 * The one step that happens outside the console. Every DNS provider's UI is
 * laid out differently, so show the three fields plainly and let the user copy
 * each one rather than describing where to paste it.
 */
function DnsRecord({ record }: { record: DomainInstructions }) {
  return (
    <div>
      <p className="mb-3 text-[0.92rem] text-muted-foreground">
        Add this record at whoever manages DNS for this domain — your registrar, or Cloudflare, or wherever the
        nameservers point.
      </p>
      <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-[auto_1fr_1fr]">
        <Field label="Type" value={record.type} />
        <Field label="Name" value={record.name} />
        <Field label="Value" value={record.value} />
      </dl>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-4 py-3">
      <dt className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-faint">{label}</dt>
      <dd className="mt-1 flex items-center gap-2">
        <span className="min-w-0 break-all font-mono text-[0.88rem] text-foreground">{value}</span>
        <CopyButton value={value} label={label} />
      </dd>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Blocked clipboard (insecure origin, denied permission). Don't claim a
      // copy that didn't happen — the value is selectable on screen anyway.
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={copy}
      aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
    >
      {copied ? <Check className="text-success" aria-hidden="true" /> : <Copy aria-hidden="true" />}
    </Button>
  );
}

/**
 * Accept what people actually paste — a full URL, a trailing slash, stray case
 * — and hand the API the bare hostname. Returns "" when there's nothing
 * plausibly domain-shaped, which also drives the submit button's disabled state.
 */
function normalizeDomain(raw: string): string {
  const host = raw
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : "";
}
