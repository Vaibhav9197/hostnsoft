"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Loader2, Share2 } from "lucide-react";

import { CopyPromptButton } from "@/app/components/CopyPromptButton";
import { LinkButton, Skeleton } from "@/app/components/console/kit";
import { Button, buttonVariants } from "@/app/components/ui/button";
import { WaIcon } from "@/app/showcase/share";
import { posterBlob, qrBlob, saveBlob } from "@/app/lib/poster";
import { showcaseListPrompt } from "@/app/lib/showcasePrompt";
import { displayUrl, shareUrls, useOrigin, waHref, whatsappText, type ShareUrls } from "@/app/lib/showcaseShare";
import { cn } from "@/app/lib/utils";

import { CopyButton } from "./CopyButton";
import { PosterPreview } from "./PosterPreview";

/**
 * Everything an organiser hands out for an event page, ready made: the link,
 * a WhatsApp message, the two ways participants add their app, and a poster
 * with a QR code.
 *
 * Shown inline on a new, empty page (where getting the word out is the only
 * job) and in the Share dialog once apps are arriving. Nothing to fill in —
 * each piece is one tap to copy, send or download.
 *
 * The prompt for participants' AI agents is copied, never displayed: it's a
 * machine instruction, and the organiser only needs to pass it on.
 */

const RESET_MS = 1800;

/* Below sm every button takes the full row at a 44px touch height. */
const ROW_BTN = "h-11 w-full sm:h-9 sm:w-auto";

type SharePage = { slug: string; title: string; intro: string | null; submitCode?: string };

function BlockLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[0.8rem] font-semibold text-muted-foreground">{children}</h3>;
}

export function ShareKit({ page, celebrate }: { page: SharePage; celebrate?: boolean }) {
  const origin = useOrigin();
  /* Only on the very first client render; the kit never renders on the server. */
  if (!origin) return <Skeleton className="h-[420px]" />;

  const urls = shareUrls(page.slug, origin);
  const message = whatsappText(page.title, page.intro, urls);

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        {/* ------------------------------------------------ for participants */}
        <section>
          <BlockLabel>For participants</BlockLabel>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <CopyPromptButton
              text={showcaseListPrompt({ slug: page.slug, title: page.title, type: "event" }, null, page.submitCode)}
              className={cn(buttonVariants({ variant: "outline" }), ROW_BTN)}
              announce="Prompt copied."
              copiedChildren={
                <>
                  <Check aria-hidden="true" />
                  Copied
                </>
              }
              failedChildren="Couldn’t copy. Try again"
              failedAnnounce="Couldn’t copy the prompt. Try again."
            >
              <Copy aria-hidden="true" />
              Copy prompt for AI agents
            </CopyPromptButton>
          </div>
          <p className="mt-3 text-[0.78rem] leading-relaxed text-faint">
            Participants paste it into Claude, Cursor or Codex, and their AI adds the app for them.
          </p>
        </section>
      </div>

      {/* ------------------------------------------------------------ poster */}
      <PosterColumn page={page} urls={urls} celebrate={celebrate} />
    </div>
  );
}

type Flash = "idle" | "preparing" | "downloaded" | "shared";

function PosterColumn({ page, urls, celebrate }: { page: SharePage; urls: ShareUrls; celebrate?: boolean }) {
  const [poster, setPoster] = useState<Flash>("idle");
  const [qr, setQr] = useState<"idle" | "downloaded">("idle");
  const [posterFailed, setPosterFailed] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  /* On a phone that can hand files to other apps, "Share poster" beats a
     download that lands somewhere in Files. Decided after mount: both checks
     need the browser. */
  const [shareFiles, setShareFiles] = useState(false);
  const posterTimer = useRef(0);
  const qrTimer = useRef(0);

  useEffect(() => {
    try {
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const probe = new File([new Uint8Array(1)], "poster.png", { type: "image/png" });
      setShareFiles(coarse && typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
    } catch {
      setShareFiles(false);
    }
    return () => {
      window.clearTimeout(posterTimer.current);
      window.clearTimeout(qrTimer.current);
    };
  }, []);

  function flashPoster(state: Flash) {
    setPoster(state);
    window.clearTimeout(posterTimer.current);
    posterTimer.current = window.setTimeout(() => setPoster("idle"), RESET_MS);
  }

  async function onPoster() {
    if (poster === "preparing") return;
    setPoster("preparing");
    setPosterFailed(false);
    let blob: Blob;
    try {
      blob = await posterBlob({ title: page.title, intro: page.intro, pageUrl: urls.pageUrl });
    } catch {
      setPoster("idle");
      setPosterFailed(true);
      return;
    }
    const filename = `${page.slug}-poster.png`;
    if (shareFiles) {
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: page.title });
          flashPoster("shared");
          return;
        } catch (e) {
          /* Closing the share sheet is a choice, not a failure. Anything else
             (lost the tap's permission while drawing, say) downloads instead. */
          if (e instanceof DOMException && e.name === "AbortError") {
            setPoster("idle");
            return;
          }
        }
      }
    }
    saveBlob(blob, filename);
    flashPoster("downloaded");
  }

  async function onQr() {
    setQrFailed(false);
    try {
      saveBlob(await qrBlob(urls.pageUrl), `${page.slug}-qr.png`);
    } catch {
      setQrFailed(true);
      return;
    }
    setQr("downloaded");
    window.clearTimeout(qrTimer.current);
    qrTimer.current = window.setTimeout(() => setQr("idle"), RESET_MS);
  }

  const PosterIcon =
    poster === "preparing" ? Loader2 : poster === "downloaded" || poster === "shared" ? Check : shareFiles ? Share2 : Download;
  const posterLabel =
    poster === "preparing"
      ? "Preparing…"
      : poster === "downloaded"
        ? "Downloaded"
        : poster === "shared"
          ? "Shared"
          : shareFiles
            ? "Share poster"
            : "Download poster";

  const announce =
    poster === "downloaded"
      ? "Poster downloaded."
      : poster === "shared"
        ? "Poster shared."
        : qr === "downloaded"
          ? "QR code downloaded."
          : posterFailed
            ? "Couldn’t make the poster in this browser."
            : qrFailed
              ? "Couldn’t make the QR code in this browser."
              : "";

  return (
    <section className="min-w-0 border-t border-border pt-5 md:border-t-0 md:pt-0">
      <BlockLabel>Poster</BlockLabel>
      <div className="mx-auto mt-3 flex w-full max-w-[280px] flex-col md:max-w-none">
        <PosterPreview
          title={page.title}
          intro={page.intro}
          slug={page.slug}
          mode={celebrate ? "develop" : "solid"}
          className="w-full max-w-[280px] md:max-w-none"
        />
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-11 w-full sm:h-9"
          onClick={onPoster}
          aria-busy={poster === "preparing" || undefined}
        >
          <PosterIcon
            aria-hidden="true"
            className={cn(poster === "preparing" && "animate-spin motion-reduce:animate-none")}
          />
          {posterLabel}
        </Button>
        <div className="mt-2 flex justify-center">
          <LinkButton onClick={onQr} className="inline-flex min-h-11 items-center gap-1.5 px-1 sm:min-h-8">
            {qr === "downloaded" && <Check aria-hidden="true" className="size-3.5" />}
            {qr === "downloaded" ? "Downloaded" : "Download QR code"}
          </LinkButton>
        </div>
        {posterFailed && (
          <p className="mt-2 text-[0.8rem] text-muted-foreground">
            Couldn’t make the poster in this browser. The link and QR code still work.
          </p>
        )}
        {qrFailed && (
          <p className="mt-2 text-[0.8rem] text-muted-foreground">
            Couldn’t make the QR code in this browser. The link still works.
          </p>
        )}
      </div>
      <output className="sr-only" aria-live="polite">
        {announce}
      </output>
    </section>
  );
}
