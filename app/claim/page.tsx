"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, ExternalLink, Loader2 } from "lucide-react";

import { COPIED_LABEL, CopyPromptButton, PromptIcon } from "../components/CopyPromptButton";
import { LoginScreen } from "../components/console/LoginScreen";
import { Alert, NativeSelect } from "../components/console/kit";
import { Button, buttonVariants } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { HnsError } from "../lib/client";
import { consoleClaimedPromptWithToken } from "../lib/deployPrompt";
import { companiesApi, orphansApi, tokensApi } from "../lib/hnsApi";
import { useSession } from "../lib/session";
import { appHost, appUrl } from "../lib/site";
import type { OrphanClaimResult } from "../lib/types";

/**
 * Keep an app that was deployed without an account.
 *
 * The deploy reply gave the user a link here carrying the app name and a
 * one-time code — the proof that they are the one who deployed it. The page
 * works like a password reset: open the link, sign in (or sign up, the same
 * widget does both), pick a workspace, and the app is theirs at the same
 * address. Nothing is redeployed and no source code is needed.
 *
 * The app name and code are moved into sessionStorage on arrival and taken
 * off the URL: the MSG91 widget's redirect comes back to a bare /claim (it
 * refuses a redirect path with a query string), and the code is a secret
 * that shouldn't sit in the address bar or the history either.
 */

const STORE_KEY = "hns.claim";
const APP_NAME = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

type Pending = { app: string; code: string };

function readStored(): Pending | null {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Pending>;
    return typeof parsed.app === "string" && typeof parsed.code === "string"
      ? { app: parsed.app, code: parsed.code }
      : null;
  } catch {
    return null;
  }
}

function store(pending: Pending | null) {
  try {
    if (pending) sessionStorage.setItem(STORE_KEY, JSON.stringify(pending));
    else sessionStorage.removeItem(STORE_KEY);
  } catch {
    // Without storage the page still works for as long as the URL has the
    // values; only the round trip through sign-up loses them.
  }
}

export default function ClaimPage() {
  /* useSearchParams needs a Suspense boundary for the static render. */
  return (
    <Suspense fallback={<Centered><Spinner /></Centered>}>
      <Claim />
    </Suspense>
  );
}

function Claim() {
  const params = useSearchParams();
  const { status } = useSession();
  /* undefined until the first effect has looked at the URL and storage. */
  const [pending, setPending] = useState<Pending | null | undefined>(undefined);
  const [result, setResult] = useState<OrphanClaimResult | null>(null);

  useEffect(() => {
    const app = params.get("app");
    const code = params.get("code");
    if (app && code && APP_NAME.test(app)) {
      const next = { app, code };
      store(next);
      setPending(next);
      /* The page has the code now; the address bar and history don't need
         it. The session provider strips its own token keys the same way. */
      window.history.replaceState({}, "", "/claim");
    } else {
      setPending(readStored());
    }
  }, [params]);

  if (pending === undefined || status === "loading") {
    return <Centered><Spinner /></Centered>;
  }

  if (!pending) {
    return (
      <Centered>
        <Card>
          <Heading>This link is incomplete</Heading>
          <p className="mt-3 text-[0.92rem] text-muted-foreground">
            The link to keep an app carries the app’s name and a code. Open the full link from your AI’s
            reply, or ask it for the link again.
          </p>
          <p className="mt-3 text-[0.84rem] text-muted-foreground">
            Deployed with a token already? Then it’s yours — <Link href="/app" className="font-semibold text-foreground underline underline-offset-2">open your apps</Link>.
          </p>
        </Card>
      </Centered>
    );
  }

  if (result) {
    return <Centered><Claimed result={result} /></Centered>;
  }

  const name = pending.app;
  return (
    <Centered>
      <div className="flex w-full max-w-[420px] flex-col gap-4">
        <header className="text-center">
          <div className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-primary">Embarko</div>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight text-foreground">Keep {name}</h1>
          <AppLink name={name} />
          <p className="mt-3 text-[0.92rem] leading-relaxed text-muted-foreground">
            It’s live but temporary: it is deleted 24 hours after it was deployed unless you keep it. Keeping it
            is a sign-in away — no redeploy, and the address stays the same.
          </p>
        </header>

        {status === "anon" ? (
          <LoginScreen frame="card" redirectPath="/claim" intro="Sign in or create an account to keep it." />
        ) : (
          <ClaimForm pending={pending} onClaimed={setResult} />
        )}
      </div>
    </Centered>
  );
}

/* ---------------------------------------------------------- signed in */

function ClaimForm({ pending, onClaimed }: { pending: Pending; onClaimed: (r: OrphanClaimResult) => void }) {
  const { companies, apiConnected, reload, setActiveCompanyId } = useSession();
  const [companyId, setCompanyId] = useState(companies[0]?.companyId ?? "");
  const [workspace, setWorkspace] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* The API answered 404: wrong code, already kept, or gone. */
  const [gone, setGone] = useState(false);

  /* Companies arrive after the first render (and after a workspace is
     created below); default to the first one once there is one. */
  useEffect(() => {
    if (!companyId && companies[0]) setCompanyId(companies[0].companyId);
  }, [companies, companyId]);

  if (!apiConnected) {
    return (
      <Alert variant="warn">
        You’re signed in, but the Embarko API service is unreachable right now. Try again in a moment — the
        link keeps working until the app’s deadline.
      </Alert>
    );
  }

  if (gone) {
    return (
      <Card>
        <Heading>This link doesn’t work anymore</Heading>
        <p className="mt-3 text-[0.92rem] text-muted-foreground">
          Either {pending.app} was already kept, or its 24 hours ran out and it was removed.
        </p>
        <Link href="/app" className={`${buttonVariants()} mt-5`}>Open your apps</Link>
      </Card>
    );
  }

  const creating = companies.length === 0;
  const chosen = companies.find((c) => c.companyId === companyId) ?? null;

  async function claim(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let target = companyId;
      if (creating) {
        const created = await companiesApi.create(workspace.trim());
        target = created.id;
        /* The session learns about the new workspace either way, so a
           failed claim below doesn't ask for a second one. */
        void reload();
      }
      const res = await orphansApi.claim(target, pending.app, pending.code);
      setActiveCompanyId(target);
      store(null);
      onClaimed(res);
    } catch (err) {
      if (err instanceof HnsError && err.status === 404) setGone(true);
      else setError(err instanceof Error ? err.message : "Couldn’t keep the app. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={claim} className="w-full border border-border bg-card p-7">
      {creating ? (
        <label className="block text-left">
          <span className="text-sm font-semibold text-foreground">Name your workspace</span>
          <span className="mt-0.5 block text-[0.84rem] text-muted-foreground">
            Your apps live in a workspace. You can rename it later.
          </span>
          <Input
            className="mt-2.5"
            placeholder="e.g. Acme Robotics"
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
            maxLength={60}
            autoFocus
            required
          />
        </label>
      ) : companies.length === 1 ? (
        <p className="text-left text-[0.92rem] text-muted-foreground">
          Into your workspace <span className="font-semibold text-foreground">{chosen?.companyName}</span>.
        </p>
      ) : (
        <label className="block text-left">
          <span className="text-sm font-semibold text-foreground">Which workspace?</span>
          <NativeSelect
            className="mt-2.5 w-full"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            {companies.map((c) => (
              <option key={c.companyId} value={c.companyId}>{c.companyName}</option>
            ))}
          </NativeSelect>
        </label>
      )}

      {error && <Alert className="mt-4 text-left">{error}</Alert>}

      <Button type="submit" className="mt-5 w-full" disabled={busy || (creating ? !workspace.trim() : !companyId)}>
        {busy ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
        {busy ? "Keeping…" : `Keep ${pending.app}`}
      </Button>
    </form>
  );
}

/* ---------------------------------------------------------------- done */

function Claimed({ result }: { result: OrphanClaimResult }) {
  const { project, bannerClearsOn } = result;
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const started = useRef(false);

  /* Made now, not on click: the clipboard write has to follow the click
     straight away, and a token request in between would get it refused.
     One token per claim — the ref keeps StrictMode's double effect from
     making two. */
  useEffect(() => {
    if (started.current || !project.companyId) return;
    started.current = true;
    tokensApi
      // "user": it goes into this person's own agent, which should keep
      // reaching the app if they later move it to another workspace.
      .create(project.companyId, "Keep my app", "user")
      .then((t) => setToken(t.token))
      .catch((e) => setTokenError(e instanceof Error ? e.message : "Couldn’t prepare the prompt."));
  }, [project.companyId]);

  const prompt = token ? consoleClaimedPromptWithToken(project.slug, token) : "";

  return (
    <Card>
      <span className="mx-auto grid size-9 place-items-center rounded-full bg-[var(--ok-soft)] text-[var(--ok-ink)]" aria-hidden="true">
        <Check className="size-5" />
      </span>
      <Heading className="mt-3">{project.slug} is yours</Heading>
      <AppLink name={project.slug} />
      <p className="mt-3 text-[0.92rem] leading-relaxed text-muted-foreground">
        It won’t be deleted, and it keeps this address.{" "}
        {bannerClearsOn === "now"
          ? "The temporary-app notice is coming off it now."
          : "The temporary-app notice comes off with its next deploy."}
      </p>

      <div className="mt-5 flex flex-col gap-2">
        <Link href={`/app/projects/${project.id}`} className={buttonVariants()}>Open in Embarko</Link>
        <CopyPromptButton
          text={prompt}
          className={buttonVariants({ variant: "outline" })}
          copiedChildren={COPIED_LABEL}
          announce="Prompt copied."
          disabled={!token}
        >
          {token || tokenError ? <PromptIcon aria-hidden="true" /> : <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          Copy prompt for your AI
        </CopyPromptButton>
      </div>
      <p className="mt-3 text-[0.84rem] leading-relaxed text-muted-foreground">
        Updates to the app now need your account’s deploy token. The prompt hands it to your AI — paste it
        into the chat that deployed the app.
      </p>
      {tokenError && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {tokenError}{" "}
          <Link href="/app/tokens" className="underline underline-offset-2">Create a token in Embarko</Link>
        </p>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------- pieces */

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center bg-background p-6">{children}</div>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="w-full max-w-[420px] border border-border bg-card p-7 text-center">{children}</div>;
}

function Heading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h1 className={`text-[1.15rem] font-extrabold tracking-tight text-foreground ${className}`}>{children}</h1>;
}

function AppLink({ name }: { name: string }) {
  return (
    <a
      href={appUrl(name)}
      target="_blank"
      rel="noreferrer"
      className="mt-1 inline-flex items-center gap-1 font-mono text-[0.8rem] text-muted-foreground hover:text-foreground hover:underline"
    >
      {appHost(name)}
      <ExternalLink className="size-3.5" aria-hidden="true" />
    </a>
  );
}

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3.5" role="status" aria-live="polite">
      <span className="size-6 animate-spin rounded-full border-2 border-input border-t-primary" aria-hidden="true" />
      <span className="font-mono text-[0.78rem] text-faint">One moment…</span>
    </div>
  );
}
