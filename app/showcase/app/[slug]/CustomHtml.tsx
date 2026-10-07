"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Creator-supplied HTML runs on our own domain, so it never goes into the
   page directly. It renders in a sandboxed frame with scripts off: styles and
   markup work, scripts, forms and top-level navigation don't. Links open in a
   new tab. allow-same-origin only lets this page read the frame's height —
   with scripts disabled nothing inside the frame can use it. */
const sandbox = "allow-same-origin allow-popups allow-popups-to-escape-sandbox";

const doc = (html: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><base target="_blank">` +
  `<style>html,body{margin:0;padding:0;background:transparent}</style></head>` +
  `<body>${html}</body></html>`;

export function CustomHtml({ html, title }: { html: string; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(240);

  const fit = useCallback(() => {
    const body = frame.current?.contentDocument?.body;
    if (!body) return;
    const measure = () => setHeight(Math.ceil(body.scrollHeight));
    measure();
    /* Web fonts and images settle after load; keep the frame sized to them. */
    new ResizeObserver(measure).observe(body);
  }, []);

  /* The frame can finish loading before hydration, so onLoad never fires. */
  useEffect(() => {
    const d = frame.current?.contentDocument;
    if (d?.readyState === "complete" && d.location.href === "about:srcdoc") fit();
  }, [fit]);

  return (
    <iframe
      ref={frame}
      title={title}
      srcDoc={doc(html)}
      sandbox={sandbox}
      onLoad={fit}
      loading="lazy"
      className="sc-custom"
      style={{ height }}
    />
  );
}
