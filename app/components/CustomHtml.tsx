"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Creator- or organiser-supplied HTML runs on our own domain, so it never
   goes into the page directly. It renders in a sandboxed frame with scripts
   off: styles and markup work, scripts, forms and top-level navigation
   don't. Links open in a new tab. allow-same-origin only lets this page read
   the frame's height and hand it the page's text colour — with scripts
   disabled nothing inside the frame can use it.

   Used on an app's Showcase page (AppDetails.customHtml), an event page
   (ShowcaseEvent.customHtml), and as the live preview in the console. */
const sandbox = "allow-same-origin allow-popups allow-popups-to-escape-sandbox";

/* Images and video shrink to the frame on a phone. These come before the
   HTML, so its own styles still win. */
const doc = (html: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><base target="_blank">` +
  `<style>html,body{margin:0;padding:0;background:transparent}img,video{max-width:100%;height:auto}</style></head>` +
  `<body>${html}</body></html>`;

/* Plain HTML with no styles of its own would otherwise render in the
   browser's default black serif, unreadable on the dark theme. The page's
   own text colour and font go on <html> from a <style> placed first in the
   frame's head, so any colour or font the HTML sets for itself still wins. */
const HOST_STYLE_ID = "embarko-host-text";
function matchHostText(frame: HTMLIFrameElement) {
  const d = frame.contentDocument;
  if (!d?.head) return;
  const host = getComputedStyle(frame);
  let style = d.getElementById(HOST_STYLE_ID);
  if (!style) {
    style = d.createElement("style");
    style.id = HOST_STYLE_ID;
    d.head.prepend(style);
  }
  style.textContent = `html{color:${host.color};font-family:${host.fontFamily}}`;
}

export function CustomHtml({
  html,
  title,
  className = "sc-custom",
  lazy = true,
}: {
  html: string;
  title: string;
  className?: string;
  /** Off for the console preview, which is on screen the moment it exists. */
  lazy?: boolean;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(240);
  const resize = useRef<ResizeObserver | null>(null);

  const fit = useCallback(() => {
    const f = frame.current;
    const body = f?.contentDocument?.body;
    if (!f || !body) return;
    matchHostText(f);
    const measure = () => setHeight(Math.ceil(body.scrollHeight));
    measure();
    /* Web fonts and images settle after load; keep the frame sized to them.
       A new document (the preview re-rendering) gets a fresh observer. */
    resize.current?.disconnect();
    resize.current = new ResizeObserver(measure);
    resize.current.observe(body);
  }, []);

  /* The frame can finish loading before hydration, so onLoad never fires. */
  useEffect(() => {
    const d = frame.current?.contentDocument;
    if (d?.readyState === "complete" && d.location.href === "about:srcdoc") fit();
  }, [fit]);

  /* Follow a theme switch made while the page is open. */
  useEffect(() => {
    const restyle = () => frame.current && matchHostText(frame.current);
    const themeAttr = new MutationObserver(restyle);
    themeAttr.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    system.addEventListener("change", restyle);
    return () => {
      themeAttr.disconnect();
      system.removeEventListener("change", restyle);
      resize.current?.disconnect();
    };
  }, []);

  return (
    <iframe
      ref={frame}
      title={title}
      srcDoc={doc(html)}
      sandbox={sandbox}
      onLoad={fit}
      loading={lazy ? "lazy" : undefined}
      className={className}
      style={{ height }}
    />
  );
}
