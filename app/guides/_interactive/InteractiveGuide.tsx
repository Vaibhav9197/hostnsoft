"use client";

import { useEffect, useRef } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ENGINES } from "./engines";

const inter = Inter({ subsets: ["latin"], variable: "--ek-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--ek-mono", display: "swap" });

/* Runs during HTML parsing, before first paint, so scroll reveals start hidden
   instead of flashing in and out. Client-side navigations get the class from
   the effect below. */
const BOOT = "document.currentScript.previousElementSibling.classList.add('js')";

/**
 * A guide with its own interactive design: every scroll is a step of the
 * journey the guide teaches. The markup is server-rendered in full (readable
 * and crawlable without JavaScript); the guide's engine, loaded as its own
 * chunk, adds the scroll scenes, demos, step ticks and the troubleshooting
 * dialog on top.
 */
export function InteractiveGuide({ slug, html }: { slug: string; html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    const load = ENGINES[slug];
    if (!host || !load) return;
    host.classList.add("js");
    let stop: (() => void) | undefined;
    let gone = false;
    // Never leave the article hidden behind reveal styles if the engine is slow or fails.
    const failsafe = window.setTimeout(() => host.classList.remove("js"), 4000);
    load()
      .then((engine) => {
        if (gone) return;
        stop = engine.initDeployGuide(host);
        window.clearTimeout(failsafe);
      })
      .catch((err) => {
        host.classList.remove("js");
        console.error(err);
      });
    return () => {
      gone = true;
      window.clearTimeout(failsafe);
      stop?.();
      // Fresh nodes drop every element listener the engine attached, so a
      // remount (Strict Mode, back/forward) starts clean.
      host.innerHTML = html;
    };
  }, [slug, html]);

  return (
    <>
      <div
        ref={ref}
        className={`ek-guide ek-g-${slug} ${inter.variable} ${mono.variable}`}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
    </>
  );
}
