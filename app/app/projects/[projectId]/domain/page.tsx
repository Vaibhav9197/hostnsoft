"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { ConfirmDialog, type ConfirmRequest } from "../../../../components/console/ConfirmDialog";
import { Alert, EmptyState, LinkButton, Page, Panel, Skeleton } from "../../../../components/console/kit";
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
  const [recovering, setRecovering] = useState<Record<string, boolean>>({});
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  // Domains we've already tried to recover a record for this mount. Without
  // this the effect below would re-fire on the state it just wrote.
  const recovered = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setDomains(null);
    setError(null);
    recovered.current.clear();
    try {
      setDomains(await domainsApi.list(activeCompanyId, projectId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load domains.");
    }
  }, [activeCompanyId, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Put the DNS record back on rows that came from the list.
   *
   * `instructions` is only returned by register and by a verify that didn't
   * resolve — the list omits it. So anyone returning to this page after the
   * first visit would find a domain still waiting on DNS and nothing to act on,
   * which is the one thing they came back for.
   *
   * Verify is a plain DNS lookup the API says is safe to repeat, and its
   * "not ready" answer carries the same record register handed out, so it's the
   * way to get one back without inventing it client-side (the A record's target
   * IP is the server's to decide, not ours to hardcode).
   */
  useEffect(() => {
    if (!activeCompanyId || !domains) return;
    const missing = domains.filter(
      (d) => d.status !== "active" && !d.instructions && !recovered.current.has(d.domain),
    );
    if (missing.length === 0) return;

    missing.forEach((d) => recovered.current.add(d.domain));
    setRecovering((r) => ({ ...r, ...Object.fromEntries(missing.map((d) => [d.domain, true])) }));

    (async () => {
      for (const d of missing) {
        let checked: Domain | null = null;
        try {
          checked = await domainsApi.verify(activeCompanyId, projectId, d.domain);
        } catch {
          /* Leave the row exactly as the list gave it. */
        }
        setRecovering((r) => ({ ...r, [d.domain]: false }));
        if (!checked) continue;
        const result = checked;
        setDomains((list) =>
          (list ?? []).map((x) => {
            if (x.domain !== result.domain) return x;
            // Good news is worth showing: DNS may well have gone live while
            // they were away. A "not ready yet" answer is not — nobody asked
            // for this check, so take only the record and leave the status
            // alone rather than greeting them with a failure they didn't cause.
            return result.status === "active"
              ? { ...x, ...result }
              : { ...x, instructions: result.instructions };
          }),
        );
      }
    })();

    /* Deliberately no cleanup that discards the result. StrictMode invokes this
       effect twice in dev; the `recovered` ref survives that, so the second run
       correctly finds nothing to do — and cancelling the first would throw away
       the only fetch anyone made. Settling into unmounted state is a no-op in
       React 18+, so letting it land costs nothing. */
  }, [activeCompanyId, projectId, domains]);

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

  /**
   * Removing is one click with no undo, and for a live domain it takes the site
   * off the air. Worse, adding it back doesn't restore it — the domain returns
   * as pending and has to clear a DNS check again, so a misclick costs a
   * propagation wait rather than a second click.
   */
  function askRemove(d: Domain) {
    setConfirm({
      title: `Remove ${d.domain}?`,
      body:
        d.status === "active" ? (
          <>
            <b>{d.domain}</b> stops being served right away. The DNS record at your provider is left alone, but
            adding the domain back here means verifying DNS all over again.
          </>
        ) : (
          <>
            <b>{d.domain}</b> and its DNS record disappear from this page. You can add it back later, but it will
            have to verify DNS again from scratch.
          </>
        ),
      cta: "Remove domain",
      destructive: true,
      dismiss: "Keep it",
      onConfirm: () => remove(d.domain),
    });
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
      {/* No page title: the tab above already says "Domain". */}
      <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
        Serve this app on a domain you own.
      </p>

      <div className="flex flex-col gap-2">
        <form className="flex flex-wrap items-center gap-2.5" onSubmit={add}>
          <Input
            className="min-w-[240px] flex-1 font-mono"
            placeholder="e.g. example.com"
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
        {/* The placeholder alone reads as "subdomains only" — this says a root
            domain is equally fine. Which record each needs is left to the
            instructions that appear once a domain is added, where the reader
            is actually about to go and set one up. */}
        <p className="text-[0.85rem] text-muted-foreground">
          Both work — a subdomain like <Ex>app.example.com</Ex>, or the root domain <Ex>example.com</Ex>
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
          recovering={!!recovering[d.domain]}
          onVerify={() => verify(d.domain)}
          onRemove={() => askRemove(d)}
        />
      ))}

      {/* Only while something is actually waiting on DNS. This answers "why
          isn't it live yet, and can I press Verify again?" — questions nobody
          has once every domain is active, where it would just be a paragraph
          about a problem the reader doesn't have. */}
      {domains?.some((d) => d.status !== "active") && (
        <p className="text-[0.92rem] text-muted-foreground">
          DNS changes can take anywhere from a few minutes to a few hours to reach us. Verifying is just a live
          lookup — nothing is rebuilt or redeployed, and it’s safe to press as often as you like.
        </p>
      )}

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
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
  recovering,
  onVerify,
  onRemove,
}: {
  domain: Domain;
  verifying: boolean;
  recovering: boolean;
  onVerify: () => void;
  onRemove: () => void;
}) {
  const live = domain.status === "active";

  return (
    <Panel padded className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="truncate font-mono text-[0.95rem] font-semibold text-foreground">{domain.domain}</span>
          {/* The API's `failed` here means "DNS doesn't point at us yet" — a
              wait, not a fault. Reading it as a red failure is alarming and
              wrong, especially now that simply opening the page runs a check. */}
          <StatusPill
            status={domain.status}
            {...(domain.status === "failed" ? { label: "Not resolving yet", tone: "warn" as const } : {})}
          />
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

          {domain.instructions ? (
            <DnsRecord record={domain.instructions} />
          ) : recovering ? (
            <Skeleton className="h-[104px]" aria-label="Loading the DNS record" />
          ) : (
            /* Neither the list nor a recovery gave us a record — say so instead
               of showing a card with nothing on it. */
            <Alert variant="warn">
              Couldn’t load the DNS record for this domain. Press Verify to fetch it again.
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={onVerify} disabled={verifying || recovering}>
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
        nameservers point. On Cloudflare, turn proxying off — “DNS only”, the grey cloud, not the orange one.
      </p>
      <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-[auto_1fr_1fr_auto]">
        <Field label="Type" value={record.type} />
        <Field label="Name" value={record.name} />
        <Field label="Value" value={record.value} />
        {/* A required setting rather than a value to paste, so no copy button —
            copying the word "Disabled" into a DNS form would be nonsense. */}
        <Field label="Proxy" value="Disabled" copyable={false} />
      </dl>
    </div>
  );
}

function Field({ label, value, copyable = true }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div className="bg-card px-4 py-3">
      <dt className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-faint">{label}</dt>
      <dd className="mt-1 flex items-center gap-2">
        <span className="min-w-0 break-all font-mono text-[0.88rem] text-foreground">{value}</span>
        {copyable && <CopyButton value={value} label={label} />}
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
