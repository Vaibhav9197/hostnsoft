"use client";

import { useEffect, useRef, useState } from "react";
import { authWidgetToken } from "../../lib/client";
import { Alert, Skeleton } from "./kit";

// MSG91's user-management widget — the same proxy-auth script that powers
// login (see LoginScreen), mounted with type "user-management" instead of
// "authorization". It renders the whole members experience itself (list,
// invite, roles, removal) into #userProxyContainer, so this component only has
// to load the script, pass the session token, and get out of the way.
//
// The container id is fixed by the widget, so only one of these can be on a
// page at a time.
const CONTAINER_ID = "userProxyContainer";
const WIDGET_SRC =
  process.env.NEXT_PUBLIC_MSG91_WIDGET_SCRIPT ??
  "https://proxy.msg91.com/assets/proxy-auth/proxy-auth.js";

declare global {
  interface Window {
    initVerification?: (config: unknown) => void;
  }
}

// The widget renders its own <main> with horizontal padding, which lands on top
// of the padding the console page already has. It lives two shadow roots deep,
// so no stylesheet of ours can reach it — the override has to be appended
// inside that root.
//
// This reaches into markup we don't own, so it's written to fail quietly: if a
// widget update renames or restructures anything, the selector simply matches
// nothing and the padding comes back. It never breaks the page.
const SHADOW_STYLE_FLAG = "data-embarko-reset";
const SHADOW_OVERRIDES = `main { padding: 0 !important; }`;

function injectPaddingReset(root: Document | ShadowRoot): boolean {
  let injected = false;
  for (const el of root.querySelectorAll("*")) {
    if (!el.shadowRoot) continue;
    const sr = el.shadowRoot;
    if (sr.querySelector("main") && !sr.querySelector(`style[${SHADOW_STYLE_FLAG}]`)) {
      const style = document.createElement("style");
      style.setAttribute(SHADOW_STYLE_FLAG, "");
      style.textContent = SHADOW_OVERRIDES;
      sr.appendChild(style);
      injected = true;
    }
    if (injectPaddingReset(sr)) injected = true;
  }
  return injected;
}

export function UserManagementWidget() {
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // Mount once. Note there's deliberately no cancellation flag here: under
    // StrictMode's double-invoked effects the guard above already skips the
    // second pass, so a cleanup that cancelled the first would leave the
    // widget unmounted forever.
    if (started.current) return;
    started.current = true;

    async function boot() {
      let authToken: string;
      try {
        authToken = await authWidgetToken();
      } catch {
        setError("Your session has expired. Reload the page and sign in again.");
        return;
      }

      if (typeof window.initVerification !== "function") {
        setError("The members widget could not be loaded. Check your connection and reload.");
        return;
      }
      if (containerRef.current) containerRef.current.innerHTML = "";
      window.initVerification({
        authToken,
        type: "user-management",
        success: (data: unknown) => {
          console.log("user-management success", data);
        },
        failure: (err: unknown) => {
          console.warn("user-management failed", err);
          setError("Something went wrong loading your team. Please reload.");
        },
      });
      setReady(true);

      // The widget mounts asynchronously, so its shadow roots don't exist yet.
      // Poll briefly rather than guess at a delay, and give up quietly.
      const deadline = Date.now() + 5000;
      const timer = window.setInterval(() => {
        if (injectPaddingReset(document) || Date.now() > deadline) {
          window.clearInterval(timer);
        }
      }, 100);
    }

    function onLoadFailure() {
      setError("The members widget could not be loaded. Check your connection and reload.");
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${WIDGET_SRC}"]`);
    if (existing && typeof window.initVerification === "function") {
      boot();
    } else if (existing) {
      existing.addEventListener("load", boot, { once: true });
    } else {
      const s = document.createElement("script");
      s.src = WIDGET_SRC;
      s.async = true;
      s.addEventListener("load", boot, { once: true });
      s.addEventListener("error", onLoadFailure);
      document.head.appendChild(s);
    }
  }, []);

  return (
    <>
      {error && <Alert>{error}</Alert>}
      {!ready && !error && <Skeleton className="h-[220px]" aria-hidden="true" />}
      <div id={CONTAINER_ID} ref={containerRef} />
    </>
  );
}
