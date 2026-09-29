"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { drawPoster, drawQrModules, loadPosterFonts, posterAddress, POSTER_H, POSTER_W } from "@/app/lib/poster";
import { qrMatrix } from "@/app/lib/qr";
import { useOrigin } from "@/app/lib/showcaseShare";
import { SITE_HOST } from "@/app/lib/site";
import { cn } from "@/app/lib/utils";

/**
 * The event poster, drawn live by the same renderer the download uses — so
 * what the organiser watches is exactly what they get.
 *
 * The QR modules sit on their own canvas layer above the rest, which is what
 * lets the three modes differ without redrawing:
 *   ghost   — the page doesn't exist yet: a faint QR and a placeholder-grey
 *             address. The create form's preview.
 *   solid   — the real thing.
 *   develop — starts as ghost, then the code comes into focus and ink, once.
 *             The "your page is live" moment.
 */

export type PosterMode = "ghost" | "solid" | "develop";

/* Typing redraws after a short pause, not on every keystroke. */
const REDRAW_MS = 120;
/* A beat after the first draw before the code develops, so the eye catches it. */
const DEVELOP_DELAY_MS = 150;

/* The address as it will be once finalised; anything the rule couldn't
   accept yet falls back to the placeholder rather than printing garbage. */
function shownSlug(slug: string): string {
  const s = /^[a-z0-9-]*$/.test(slug) ? slug.replace(/^-+|-+$/g, "") : "";
  return s || "your-showcase";
}

function safeMatrix(text: string): boolean[][] | null {
  try {
    return qrMatrix(text);
  } catch {
    return null;
  }
}

export function PosterPreview({
  title,
  intro,
  slug,
  mode = "solid",
  className,
}: {
  /** Raw text; blank draws "Your event name" as a placeholder. */
  title: string;
  /** Blank or null leaves the line out — never filler. */
  intro?: string | null;
  /** May be blank or partial; the QR and address then use "your-event". */
  slug: string;
  mode?: PosterMode;
  /** Controls width; the A4 aspect ratio is kept here. */
  className?: string;
}) {
  const origin = useOrigin();
  const pageUrl = origin ? `${origin}/showcase/${shownSlug(slug)}` : null;
  const matrix = useMemo(() => (pageUrl ? safeMatrix(pageUrl) : null), [pageUrl]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const drawnOnce = useRef(false);
  const [width, setWidth] = useState(0);
  const [drawn, setDrawn] = useState(false);
  const [developed, setDeveloped] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!pageUrl || !width) return;
    let cancelled = false;

    async function draw() {
      const fonts = await loadPosterFonts();
      const base = baseRef.current;
      const layer = qrRef.current;
      if (cancelled || !base || !layer || !pageUrl) return;
      const bctx = base.getContext("2d");
      const qctx = layer.getContext("2d");
      if (!bctx || !qctx) return;

      /* Sized in device pixels so it is sharp on a retina screen. Resizing a
         canvas clears it, so it happens here, right before the redraw. */
      const dpr = window.devicePixelRatio || 1;
      const pw = Math.round(width * dpr);
      const ph = Math.round((pw * POSTER_H) / POSTER_W);
      for (const c of [base, layer]) {
        if (c.width !== pw || c.height !== ph) {
          c.width = pw;
          c.height = ph;
        }
      }
      const scale = pw / POSTER_W;

      bctx.setTransform(scale, 0, 0, scale, 0, 0);
      const { card } = drawPoster(bctx, { title, intro, pageUrl, ghost: mode === "ghost" }, fonts);

      qctx.setTransform(1, 0, 0, 1, 0, 0);
      qctx.clearRect(0, 0, pw, ph);
      if (matrix) {
        qctx.setTransform(scale, 0, 0, scale, 0, 0);
        drawQrModules(qctx, matrix, card);
      }

      if (!drawnOnce.current) {
        drawnOnce.current = true;
        setDrawn(true);
      }
    }

    const t = window.setTimeout(
      () => {
        draw().catch(() => {
          /* No canvas text in this browser: the placeholder stays, and the
             share kit says so if the download fails too. */
        });
      },
      drawnOnce.current ? REDRAW_MS : 0,
    );
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [pageUrl, matrix, width, title, intro, mode]);

  useEffect(() => {
    if (mode !== "develop" || !drawn) return;
    const t = window.setTimeout(() => setDeveloped(true), DEVELOP_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [mode, drawn]);

  const faint = mode === "ghost" || (mode === "develop" && !developed);
  const address = pageUrl ? posterAddress(pageUrl) : `${SITE_HOST}/showcase/${shownSlug(slug)}`;
  const name = title.trim() || "your showcase";

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label={`Poster for ${name}, with a QR code for ${address}`}
      className={cn("relative aspect-[1654/2339] overflow-hidden border border-border bg-muted shadow-sm", className)}
    >
      {origin && (
        <>
          <canvas ref={baseRef} className="absolute inset-0 h-full w-full" />
          <canvas
            ref={qrRef}
            className="absolute inset-0 h-full w-full transition-[opacity,filter] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none"
            style={{
              opacity: faint ? 0.18 : 1,
              filter: mode === "develop" && !developed ? "blur(3px)" : "blur(0px)",
            }}
          />
        </>
      )}
    </div>
  );
}
