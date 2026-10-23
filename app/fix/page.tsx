"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { CopyPromptButton, PromptIcon } from "../components/CopyPromptButton";
import { buttonVariants } from "../components/ui/button";
import { cn } from "../lib/utils";

/**
 * Where an alert email's "Fix with your AI" button lands. An email can't
 * touch the clipboard, so the button opens this page, which copies the
 * prompt the moment it loads and says so. Browsers that only allow a copy
 * after a click (Safari, Firefox) get one big Copy button instead.
 *
 * The prompt rides in the URL fragment as base64url JSON {app, job, prompt},
 * written by hostnsoft-api's scheduleAlerts.ts (fixLink). A fragment never
 * reaches a server, so no log holds the app's error text, and the page needs
 * no sign-in: the person may be reading mail on a phone.
 */

type Fix = { app: string; job: string; prompt: string };

function readFix(): Fix | null {
  try {
    const raw = window.location.hash.slice(1);
    if (!raw) return null;
    const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes)) as Partial<Fix>;
    if (typeof data.prompt !== "string" || !data.prompt) return null;
    return { app: String(data.app ?? ""), job: String(data.job ?? ""), prompt: data.prompt };
  } catch {
    return null;
  }
}

export default function FixPage() {
  const [fix, setFix] = useState<Fix | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const found = readFix();
    setFix(found);
    if (!found) return;
    navigator.clipboard
      .writeText(found.prompt)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  }, []);

  if (fix === undefined) return <Centered />;

  if (!fix) {
    return (
      <Centered>
        <h1 className="text-[1.15rem] font-extrabold tracking-tight text-foreground">This link is incomplete</h1>
        <p className="mt-3 text-[0.92rem] text-muted-foreground">
          Open the button in the email again, or find the job in Embarko and use Fix with your AI there.
        </p>
        <a href="/app" className={cn(buttonVariants({ variant: "outline" }), "mt-5 w-full")}>
          Open in Embarko
        </a>
      </Centered>
    );
  }

  return (
    <Centered>
      <div className="mx-auto grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
        {copied ? <Check aria-hidden="true" /> : <PromptIcon aria-hidden="true" />}
      </div>
      <h1 className="mt-4 text-[1.3rem] font-extrabold leading-tight tracking-tight text-foreground">
        {copied ? "Copied. Now paste it into your AI." : "Copy the fix for your AI"}
      </h1>
      <p className="mt-2 text-[0.92rem] leading-relaxed text-muted-foreground">
        Paste it into the AI that built {fix.app ? <b className="text-foreground">{fix.app}</b> : "your app"}. It
        has everything it needs to fix {fix.job ? <>&ldquo;{fix.job}&rdquo;</> : "the job"}.
      </p>

      <CopyPromptButton
        text={fix.prompt}
        className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full")}
        onCopied={() => setCopied(true)}
        announce="Prompt copied. Paste it into your AI."
        copiedChildren={
          <>
            <Check aria-hidden="true" />
            Copied
          </>
        }
        failedChildren="Couldn't copy. Select the text below instead."
      >
        <PromptIcon aria-hidden="true" />
        {copied ? "Copy again" : "Copy prompt"}
      </CopyPromptButton>

      <details className="mt-5 text-left">
        <summary className="cursor-pointer text-[0.84rem] text-muted-foreground">See the prompt</summary>
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words border border-border bg-muted p-3 font-mono text-[0.75rem] leading-relaxed text-foreground">
          {fix.prompt}
        </pre>
      </details>

      <a href="/app" className="mt-5 inline-block text-[0.84rem] font-semibold text-foreground underline underline-offset-2">
        Open in Embarko
      </a>
    </Centered>
  );
}

function Centered({ children }: { children?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-[420px] border border-border bg-card p-7 text-center">{children}</div>
    </div>
  );
}
