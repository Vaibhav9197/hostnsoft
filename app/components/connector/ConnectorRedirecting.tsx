"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

/** How long before the wait reads as stuck and the text says what to do. */
const SLOW_MS = 10_000;

/** "https://claude.ai/api/mcp/callback" → "claude.ai". Null if it won't parse. */
export function destinationHost(redirectUri: string | null): string | null {
  if (!redirectUri) return null;
  try {
    return new URL(redirectUri).host.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/**
 * What the person sees between a successful sign-in and landing back in
 * their AI tool. The hand-off takes a few seconds (the bridge route, then
 * hostnsoft-api's callback, then the tool's own redirect), and without this
 * the sign-in form just sat there looking unfinished.
 *
 * No retry button on purpose: the sign-in token is single-use, so sending it
 * again would fail. If it's stuck, the way out is connecting again from the
 * AI tool.
 */
export function ConnectorRedirecting({ host }: { host: string | null }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), SLOW_MS);
    return () => window.clearTimeout(id);
  }, []);

  const where = host ?? "your AI tool";

  return (
    <div role="status" aria-live="polite" className="mt-5 flex flex-col gap-3">
      <div className="flex items-center gap-2.5 text-[0.92rem] text-foreground">
        <Check className="size-4 shrink-0 text-[var(--ok)]" aria-hidden="true" />
        Signed in
      </div>
      <div className="flex items-center gap-2.5 text-[0.92rem] text-foreground">
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />
        Connecting Embarko to {where}…
      </div>
      <p className="mt-1 text-[0.85rem] text-muted-foreground">
        {slow
          ? `Still working… If nothing happens, go back to ${host ?? "your AI tool"} and connect Embarko again.`
          : "This takes a few seconds. Keep this tab open."}
      </p>
    </div>
  );
}
