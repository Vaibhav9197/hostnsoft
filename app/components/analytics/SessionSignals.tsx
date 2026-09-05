"use client";

import { useEffect, useRef } from "react";

import { GTM_ID, pushToDataLayer } from "@/app/lib/gtm";
import { useSession } from "@/app/lib/session";

/**
 * Publishes who's signed in to the dataLayer, so one container can serve both
 * sides of the login wall.
 *
 * `user_state` is the variable to build triggers on: fire marketing pixels on
 * `logged_out`, product analytics on `logged_in`. That plus a blocking trigger
 * on `^/app` is what replaces a second GTM container.
 *
 * DELIBERATELY ABSENT: email and name. GA4's terms forbid sending PII, and
 * everything on the dataLayer is readable by every tag in the container —
 * including third-party ones. `user_id` here is the API's opaque id, which is
 * exactly what GA4's User-ID feature wants anyway.
 *
 * Mounted inside SessionProvider (see console-shell.tsx), so it only runs in
 * the console. Marketing pages have no session and stay `logged_out` by
 * default — GTM treats an unset variable as undefined, so give the trigger a
 * `does not equal logged_in` condition rather than testing for `logged_out`.
 */
export function SessionSignals() {
  const { status, user, activeCompanyId } = useSession();

  /* The session object is rebuilt on every provider render, so pushing on each
     one would flood the dataLayer with identical events. Only transitions get
     sent. */
  const lastSignature = useRef<string | null>(null);

  useEffect(() => {
    if (!GTM_ID) return;
    if (status === "loading") return;

    const authed = status === "authed" && user !== null;
    const signature = authed ? `in:${user.id}:${activeCompanyId ?? ""}` : "out";
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;

    pushToDataLayer(
      authed
        ? {
            event: "session_state",
            user_state: "logged_in",
            user_id: user.id,
            company_id: activeCompanyId,
          }
        : /* Null the previous values rather than omitting them. dataLayer
             variables persist for the life of the page, so after a sign-out
             a stale user_id would ride along on every later event. */
          {
            event: "session_state",
            user_state: "logged_out",
            user_id: null,
            company_id: null,
          },
    );
  }, [status, user, activeCompanyId]);

  return null;
}
